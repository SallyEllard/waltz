/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016  Khartec Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import _ from 'lodash';
import {
    buildHierarchies, getParents, groupHierarchyByKey,
    indexHierarchyByKey
} from "../../common/hierarchy-utils";


/**
 * Given a set of mappings converts them into a standard format using
 * the provided helper methods.
 *
 * The output is: { domainId, app, rating }
 *
 * @param mappings
 * @param domainIdProvider
 * @param appProvider
 * @param ratingProvider
 */
function normalizeMappings(mappings = [],
                           domainIdProvider,
                           appProvider,
                           ratingProvider) {
    return _
        .chain(mappings)
        .map(m => {
            return {
                domainId: domainIdProvider(m),
                app: appProvider(m),
                rating: ratingProvider(m)
            }
        })
        .value();
}


function populateRelated(hierarchyData) {
    const popParents = (node, mapping) => {
        _.each(
            getParents(node),
            parent => {
                parent.mappings.heirs = _.unionBy(
                    parent.mappings.heirs,
                    [ mapping ],
                    m => m.app.id)
            });
    };

    const popChildren = (node, mapping) => {
        _.each(
            node.children,
            child => {
                child.mappings.inherited = _.unionBy(
                    child.mappings.inherited,
                    [ mapping ],
                    m => m.app.id);
                popChildren(child, mapping);
            });
    };

    const byId = hierarchyData.nodesById;
    const nodes = _.values(byId);
    _.chain(nodes)
        .flatMap(n => n.mappings.direct)
        .each(mapping => {
            const node = byId[mapping.domainId];
            popParents(node, mapping);
            popChildren(node, mapping);
        })
        .value();
}


/**
 * Determine the domain entities required to build a minimal (but complete) hierarchy
 * encompassing the given mappings.  It does this by finding all ancestors of domain
 * items mentioned in the mappings.
 *
 * @param allDomain
 * @param mappings
 */
function determineRequiredDomainEntities(domainById = [], mappings = []) {
    return _
        .chain(mappings)
        .map(m => domainById[m.domainId])
        .compact()
        .uniqBy('id')
        .flatMap(m => findAncestors(domainById, m))
        .uniqBy('id')
        .value();
}


function findAncestors(dataTypesById, dt) {
    const acc = [ ];
    let ptr = dt;
    while (ptr) {
        acc.push(ptr);
        ptr = dataTypesById[ptr.parentId];
    }
    return acc;
}


function mkHierarchyDataSet(requiredElems) {
    const hierarchy = buildHierarchies(requiredElems);
    const nodesById = indexHierarchyByKey(hierarchy, n => n.id);
    const nodesByParent = groupHierarchyByKey(hierarchy, n => n.parentId);

    return {
        hierarchy,
        nodesById,
        nodesByParent
    };
}


function prepareDataSet(allDomainEntities = [], mappings = []) {

    const mkInitMappings = () => ({
        mappings: {
            direct: [],
            inherited: [],
            heirs: []
        }
    });

    const domainEntities = _.map(
        allDomainEntities,
        d => Object.assign({}, d, mkInitMappings()));

    const domainById = _.keyBy(domainEntities, 'id');

    _.chain(mappings)
        .filter(m => domainById[m.domainId])
        .each(m => domainById[m.domainId].mappings.direct.push(m))
        .value();

    const requiredDomainEntities = determineRequiredDomainEntities(domainById, mappings);
    const hierarchyData = mkHierarchyDataSet(requiredDomainEntities);

    populateRelated(hierarchyData);

    return hierarchyData;
}


function recalcDomain(dataSet, focusId) {
    const potentialParents = _
        .chain(dataSet.nodesByParent[focusId] || [])
        .sortBy('name')
        .map()
        .value();

    return potentialParents;
}


function focus(dataSet, id) {
    const domain = recalcDomain(dataSet, id);
    if (domain.length == 0) {
        return null;
    } else {
        const active = dataSet.nodesById[id];
        return {
            domain,
            active,
            parents: getParents(active),
        };
    }
}


function scoreMapping(app, directs = [], heirs = [], ancestors = []) {
    if (_.includes(directs, app.id)) { return 'DIRECT'; }
    else if (_.includes(heirs, app.id)) { return 'HEIR'; }
    else if (_.includes(ancestors, app.id)) { return 'ANCESTOR'; }
    else { return app.hasMappings ? 'NONE' : 'UNKNOWN'; }
}


function determineRating(colMappings, appId) {
    const findRatings = rs => _
        .chain(rs)
        .filter(r => r.app.id === appId)
        .map('rating')
        .value();

    const directRatings = findRatings(colMappings.direct, appId);
    const heirRatings = findRatings(colMappings.heirs, appId);
    const ancestorRatings = findRatings(colMappings.inherited, appId);

    const ratings = _.concat(directRatings, heirRatings, ancestorRatings);
    return _.head(ratings) || 'Z';
}


function calcRowGroups(chart) {
    const rowGroups = _
        .chain(chart.rows.domain)
        .map(rowDomainValue => {
            const getApps = mappings => _
                .chain(mappings)
                .values()
                .flatten()
                .map('app')
                .value();

            const rowApplications = getApps(rowDomainValue.mappings);

            const colsDomain = _.get(chart, "cols.domain", []);
            if (colsDomain.length == 0){
                return null;
            }

            const colApplications = _
                .chain(colsDomain)
                .flatMap(d => getApps(d.mappings))
                .uniqBy('id')
                .value();

            const applications = _.unionBy(rowApplications, colApplications, 'id');

            const directAppIds = _.map(rowDomainValue.mappings.direct, 'app.id');
            const ancestorAppIds = _.map(rowDomainValue.mappings.inherited, 'app.id');
            const heirAppIds = _.map(rowDomainValue.mappings.heirs, 'app.id');

            const applicationsWithMappings = _
                .chain(applications)
                .sortBy('name')
                .map(app => {
                    const rowType = scoreMapping(app, directAppIds, heirAppIds, ancestorAppIds);
                    if (rowType === 'NONE') {
                        return null;
                    }

                    const mappings = _.map(colsDomain, colDomainValue => {
                        const colType = scoreMapping(
                            app,
                            _.map(colDomainValue.mappings.direct, 'app.id'),
                            _.map(colDomainValue.mappings.heirs, 'app.id'),
                            _.map(colDomainValue.mappings.inherited, 'app.id'));

                        const rating = determineRating(colDomainValue.mappings, app.id);

                        return {
                            colId: colDomainValue.id,
                            groupId: rowDomainValue.id,
                            rowType,
                            colType,
                            rating
                        };
                    });
                    return {
                        app,
                        mappings
                    };
                })
                .compact()
                .reject(row => _.every(row.mappings, m => m.colType === 'NONE'))
                .compact()
                .value();

            return {
                domain: rowDomainValue,
                rows: applicationsWithMappings
            };
        })
        .compact()
        .reject(rowGroup => rowGroup.rows.length == 0)
        .value();
    return rowGroups;
}


function prepareMeasurableMappings(ratings, appsById) {
    // only interested in ratings for the auth sources
    const authRatings = _.filter(ratings, m => appsById[m.entityReference.id]);

    return normalizeMappings(
        authRatings,
        m => m.measurableId,
        m => appsById[m.entityReference.id],
        m => m.rating);
}

export default class AuthSourcesNavigatorUtil {

    constructor(dataTypes = [],
                measurables = [],
                authSources = [],
                ratings = []) {

        this.options = {
            xId: null,
            yId: null
        };

        this.dataTypesByCode = _.keyBy(dataTypes, 'code');

        const appIdsWithRatings = _.chain(ratings)
            .map('entityReference.id')
            .uniq()
            .value();

        const apps = _.map(authSources, authSource => {
            const appRef = authSource.applicationReference;
            return Object.assign({}, appRef, { hasMappings: _.includes(appIdsWithRatings, appRef.id) });
        });

        this.appsById = _.keyBy(apps, 'id');

        const authSourceMappings = normalizeMappings(
            authSources,
            m => this.dataTypesByCode[m.dataType].id,
            m => this.appsById[m.applicationReference.id],
            m => 'Z');

        const measurableMappings = prepareMeasurableMappings(
            ratings,
            this.appsById);

        this.dataTypeDataSet = prepareDataSet(dataTypes, authSourceMappings);
        this.measurableDataSet = prepareDataSet(measurables, measurableMappings);

        this.chart = {};

        this.listeners = [];
    }


    addListener(callback) {
        this.listeners.push(callback);
        callback(this.chart);
    }


    notifyListeners() {
        _.each(this.listeners, cb => cb(this.chart));
    }


    refresh(newOptions) {
        _.merge(this.options, newOptions)

        this._focusCol(this.options.xId, false);
        this._focusRowGroup(this.options.yId, false);
        this.chart.rowGroups = calcRowGroups(this.chart);
        this.notifyListeners();

        return this.chart;
    }


    _focusRowGroup(id) {
        const result = focus(this.dataTypeDataSet, id);
        if (result) {
            const chartDelta = {
                rows: result
            };
            this.chart = Object.assign({}, this.chart, chartDelta);
        }
        return this.chart;
    }


    _focusCol(id) {
        const result = focus(this.measurableDataSet, id);
        if (result) {
            const numDomainValues = result.domain.length || 1;
            const chartDelta = {
                cols: result,
                colStyle: { width: `${70 / numDomainValues}%` }
            };
            this.chart = Object.assign({}, this.chart, chartDelta);
        }
        return this.chart;
    }

}
