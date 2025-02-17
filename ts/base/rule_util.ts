// Copyright 2020 Volker Sorge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utility working on modified SRE rule structures.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

import {Action} from './rules';
import {getRuleSet, JsonRule, JsonRules, loadMathmaps, LocaleRules, saveMathmaps} from './util';


export function compareActions(act1: string, act2: string) {
  let comp1 = Action.fromString(act1).components;
  let comp2 = Action.fromString(act2).components;
  if (comp1.length !== comp2.length) {
    return false;
  }
  for (let i = 0; i < comp1.length; i++) {
    if (comp1[i].toString() !== comp2[i].toString()) {
      return false;
    }
  }
  return true;
}


/**
 * Selects a named rule from one locale.
 * @param {LocaleRules} rules The set of all rules.
 * @param {string} rule The rule name to select.
 */
export function selectRule(rules: JsonRules, rule: string) {
  return rules.rules.find((a: JsonRule)  => a[1] === rule);
}

/**
 * Selects a named rule from all locales.
 * @param {LocaleRules} rules The set of all rules.
 * @param {string} rule The rule name to select.
 */
export function selectRules(locale: LocaleRules, rule: string) {
  let results: {[iso: string]: JsonRule} = {};
  for (let [iso, rules] of Object.entries(locale)) {
    let localeRule = selectRule(rules, rule);
      if (localeRule) {
        results[iso] = localeRule;
      } else {
        console.info(`Entry ${rule} does not exist in locale ${iso}`);
      }
  }
  return results;
}


let domainActions: {[domain: string]: LocaleRules} = {};
export function allActions(domain: string) {
  if (domainActions[domain]) {
    return domainActions[domain];
  }
  domainActions[domain] = getRuleSet(domain, 'actions');
  return domainActions[domain];
}


/**
 * Print a comparison table for an action in all locales. 
 * @param {string} domain The domain.
 * @param {string} action The action.
 */
export function showActions(domain: string, action: string) {
  let actions = selectRules(allActions(domain), action);
  for (let [iso, action] of Object.entries(actions)) {
    console.log(`${iso}: ${action}`);
  }
}


export function actionsComparison(domain: string) {
  let actions = allActions(domain);
  let first = Object.values(actions)[0];
  let result: string[] = [];
  for (let action of first.rules) {
    let name = action[1];
    let comp = true;
    for (let act of Object.values(actions)) {
      let comparing = selectRule(act, name);
      if (!comparing) {
        comp = false;
        break;
      }
      if (!compareActions(action[2], comparing[2])) {
        comp = false;
        break;
      }
    }
    if (comp) {
      result.push(name);
    }
  }
  return result;
}


function removeRules(rules: JsonRule[], names: string[]) {
  let restRules = [];
  let baseRules = [];
  for (let rule of rules) {
    if (names.includes(rule[1])) {
      baseRules.push(rule);
    } else {
      restRules.push(rule);
    }
  }
  return [baseRules, restRules];
}


export function moveRules(domain: string, names: string[]) {
  let actions = allActions(domain);
  let baseActions = null;
  for (let [iso, rule] of Object.entries(actions)) {
    let [base, rest] = removeRules(rule.rules, names);
    rule.rules = rest;
    saveMathmaps(iso, domain, rule, 'actions');
    baseActions = base;
  }
  let baseActionsSet = loadMathmaps('base', domain, 'actions');
  baseActionsSet.rules = baseActionsSet.rules.concat(baseActions);
  saveMathmaps('base', domain, baseActionsSet, 'actions');
}
