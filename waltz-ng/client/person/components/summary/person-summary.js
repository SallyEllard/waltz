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

import {enrichServerStats} from "../../../server-info/services/server-utilities";
import {calcComplexitySummary} from "../../../complexity/services/complexity-utilities";
import template from './person-summary.html';
import {initialiseData} from "../../../common/index";
import {CORE_API} from "../../../common/services/core-api-utils";


const bindings = {
    parentEntityRef: '<',
    scope: '@?',
    person: '<',
    directs: '<',
    managers: '<',
    applications: '<',
    complexity: '<',
    serverStats: '<',
    flows: '<'
};


const initialState = {
    scope: 'CHILDREN'
};




function controller(serviceBroker) {
    const vm = initialiseData(this, initialState);

    vm.$onInit = () => {


    };

    vm.$onChanges = () => {
        if (vm.parentEntityRef) {

            const selector = {
                entityReference: vm.parentEntityRef,
                scope: vm.scope
            };
            serviceBroker
                .loadViewData(
                    CORE_API.AssetCostStore.findTotalCostForAppSelector,
                    [selector])
                .then(r => vm.totalCost = r.data);

        }
        vm.complexitySummary = calcComplexitySummary(vm.complexity);
        vm.enrichedServerStats = enrichServerStats(vm.serverStats);
    }
}


controller.$inject = ['ServiceBroker'];


const component = {
    controller,
    template,
    bindings
};


export default {
    component,
    id: 'waltzPersonSummary'
};