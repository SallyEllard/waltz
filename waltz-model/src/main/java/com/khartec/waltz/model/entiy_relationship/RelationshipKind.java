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

package com.khartec.waltz.model.entiy_relationship;

import com.khartec.waltz.model.EntityKind;
import org.jooq.lambda.tuple.Tuple2;

import java.util.Collections;
import java.util.Set;

import static com.khartec.waltz.common.SetUtilities.fromArray;
import static com.khartec.waltz.model.EntityKind.*;
import static org.jooq.lambda.tuple.Tuple.tuple;


public enum RelationshipKind {

    HAS(Collections.emptySet()),

    DEPRECATES(fromArray(
            tuple(CHANGE_INITIATIVE, APPLICATION)
    )),

    LOOSELY_RELATES_TO(fromArray(
            tuple(MEASURABLE, MEASURABLE)
    )),

    PARTICIPATES_IN(fromArray(
            tuple(APPLICATION, PROCESS),
            tuple(APPLICATION, CHANGE_INITIATIVE)
    )),

    RELATES_TO(fromArray(
            tuple(APP_GROUP, CHANGE_INITIATIVE),
            tuple(MEASURABLE, MEASURABLE)
    )),

    SUPPORTS(fromArray(
            tuple(APPLICATION, CHANGE_INITIATIVE),
            tuple(MEASURABLE, PROCESS)
    ));


    private Set<Tuple2<EntityKind, EntityKind>> allowedEntityKinds;


    RelationshipKind(Set<Tuple2<EntityKind, EntityKind>> allowedEntityKinds) {
        this.allowedEntityKinds = allowedEntityKinds;
    }


    public Set<Tuple2<EntityKind, EntityKind>> getAllowedEntityKinds() {
        return this.allowedEntityKinds;
    }

}
