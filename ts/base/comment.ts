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
 * @fileoverview Data structures for comments.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

import {loadComments, saveComments, sreDomains} from './util';

export class Comment {

  /**
   * Comments for each parameter.
   */
  public parameters: {[para: string]: string} = {};

  /**
   * The locales a rule belongs to together with the number of parameters for
   * that locale.
   */
  public locales: {[loc: string]: number} = {};

  /**
   * The overall rule description
   */
  public description: string = '';

  /**
   * A latex example.
   */
  public latex: string = '';

  /**
   * A latex example.
   */
  public example: string = '';

  /**
   * Maximum number of parameters for locales. If this is smaller than the
   * number of parameters, they will be pruned on saving.
   */
  private maximum: number = 0;

  /**
   * @param rule The name of the rule the comment is for.
   */
  constructor(public rule: string, parameters: string[] = []) {
    this.cleanParameters(parameters).forEach(p => this.parameters[p] = '');
  }

  /**
   * @return The Yaml format for this comment.
   */
  public toYaml(locale: string): string {
    let out = [`# ${this.description}`];
    if (this.example) {
      out.push(`# Example: ${this.example}`);
    }
    if (this.latex) {
      out.push(`# LaTeX Example: $${this.latex}$`);
    }
    let length = this.locales[locale];
    let count = 0;
    for (let [param, str] of Object.entries(this.parameters)) {
      if (count === length) {
        break;
      }
      count++;
      out.push(`# ${param}: ${str}`);
    }
    return out.join('\n');
  }

  public fromJson(json: any) {
    this.locales = json.locales;
    this.parameters = json.parameters;
    this.rule = json.rule;
    this.description = json.description || '';
    this.latex = json.latex || '';
    this.example = json.example || '';
    this.maximum = Object.values(this.locales).
      reduce((x, y) => Math.max(x, y), 0);
    if (this.maximum !== json.maximum) {
      console.warn(`Incorrect max value in comment ${this.rule}`);
    }
  }

  public update(locale: string, keys: string[]) {
    keys = this.cleanParameters(keys);
    let length = keys.length;
    this.locales[locale] = length;
    if (length <= this.maximum) {
      return;
    }
    keys.slice(this.maximum).forEach(x => this.parameters[x] = '');
    this.maximum = length;
  }


  /**
   * Removes all parameters that exceed the maximum of needed parameters.
   */
  public prune() {
    let length = Object.keys(this.parameters).length;
    if (this.maximum > length) {
      console.error(`Not enough parameters in ${this.rule}!`);
      return;
    }
    if (this.maximum === length) {
      return;
    }
    for (let i = this.maximum + 1; i <= length; i++) {
      delete this.parameters[`%${i}`];
    }
  }


  /**
   * Cleans a parameter map by removing everything that is not of the for %1-n.
   * @param map The map to clean.
   */
  private cleanParameters(map: string[]) {
    return map.filter(x => x.match(/^%[0-9]+$/) && x !== '%0');
  }

}

declare type CommentSet = {[name: string]: Comment};
let commentSet: {[domain: string]: CommentSet} = {};


/**
 * Retrieves a comment set for the given domain.
 * @param domain The domain.
 */
export function getComments(domain: string) {
  let comments = commentSet[domain];
  if (comments) {
    return comments;
  }
  let newSet = {};
  commentSet[domain] = newSet;
  return newSet;
}


/**
 * Saves comments for a particular domain to a file.
 * @param file The filename.
 * @param domain The domain to save.
 */
export function writeComments(domain: string) {
  let comments = getComments(domain);
  for (let comment of Object.values(comments)) {
    comment.prune();
  }
  saveComments(domain, comments);
}


/**
 * Populates the global comment set structure.
 */
export function readComments() {
  for (let domain of sreDomains) {
    let json = loadComments(domain);
    let cset: CommentSet = {};
    for (let [rule, jcom] of Object.entries(json)) {
      let comment = new Comment(rule);
      comment.fromJson(jcom);
      cset[rule] = comment;
    }
    commentSet[domain] = cset;
  }
}
