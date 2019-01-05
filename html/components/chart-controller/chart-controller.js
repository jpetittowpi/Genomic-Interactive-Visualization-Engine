/**
@license
Copyright 2017 GIVe Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/*
### Overview

`<chart-controller>` provides a Web Component element to embed a complete browser
in any html pages.

```html
<chart-controller title-text="My GIVE Browser"
  group-id-list='["genes", "singleCell"]' ref='["mm10"]'></chart-controller>
```

The embedded browser contains three major components:
view area, input for navigation and track controls.

#### View area

View area is the main part of the browser where individual tracks are being shown.
It is implemented by using a `<chart-area>` element.
Multiple views of the same genomic reference are also supported.

Please refer to [`GIVe.ChartArea`](../chart-area/index.html) for further details and [`GIVe.RefEmbedMixin`](../ref-embed-mixin/index.html) for references used in the display.

#### Input for navigation

`<chart-controller>` provides a input field for navigation purposes, genomic
coordinates in `chrX:XXXXXXX-XXXXXXX` or `chrX XXXXXXX XXXXXXX` formats are
accepted. Also gene names can be typed to search for a specific gene.

The input field is a `<gene-coor-input>` element. See
[`GIVe.GeneCoorInput`](../gene-coor-input/index.html) for
details. Gene annotations are generated from NCBI `gene_info` file.

#### Track controls

Track controls are implemented via a `<chart-track-group-list>` element. See
[`GIVe.ChartTrackGroupList`](../chart-track-list/index.html) for details.

*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../../../../@polymer/polymer/polymer-legacy.js';

import '../../../../@polymer/paper-icon-button/paper-icon-button.js';
import '../../../../@polymer/paper-button/paper-button.js';
import '../../../../@polymer/paper-slider/paper-slider.js';
import '../../../../@polymer/paper-tooltip/paper-tooltip.js';
import '../../../../@polymer/app-layout/app-layout.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout.js';
import '../give-styles.js';
import '../gene-coor-input/gene-coor-input.js';
import '../chart-area/chart-area.js';
import '../chart-track-list/chart-track-list.js';
import '../custom-track-controller/custom-track-controller.js';
import '../give-card/give-card.js';
import '../priority-manager/priority-manager.js';
import '../../../../@webcomponents/shadycss/entrypoints/apply-shim.js';
import { PolymerElement } from '../../../../@polymer/polymer/polymer-element.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="chart-controller">
  <template>
    <style include="give-shared-styles iron-flex iron-flex-alignment iron-positioning">
      :host {
        font-size: var(--base-font-size, var(--default-font-size));
        @apply --layout-fit;
        --app-drawer-width: 270px;
      }
      gene-coor-input {
        margin: 0.3em 0.1em;
      }
      div.smallText {
        font-size: smaller;
        display: block;
        margin-left: 0.5em;
      }
      div.dataReference > slot {
        padding: 1em;
      }
      div#navigationHelp {
        margin-right: 2em;
      }
      div#controlButtonGroup {
        padding: 0 0.25em;
      }
      div#controlButtonGroup > * {
        margin-left: 0.25em;
        margin-right: 0.25em;
      }
      app-drawer-layout:not([narrow]) [drawer-toggle] {
        display: none;
      }
      app-drawer > div {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
      }
      app-drawer > div > div {
        padding: 0.5em 0;
        font-size: var(--base-font-size, var(--default-font-size));
        position: relative;
      }
      app-drawer {
        --app-drawer-content-container: {
          background: var(--card-background-color);
        };
      }
      app-drawer > div > div > * {
        margin: 0 0.5em;
      }
      div#coordinateHolder {
        margin-bottom: 2em;
      }
      div#coordinateHolder gene-coor-input {
        margin: 0.25em 0.5em;
      }
      app-drawer chart-track-list {
        background: var(--card-background-color);
      }
      app-drawer chart-track-list.expanded {
        @apply --layout-fit;
        z-index: 10;
      }
      app-toolbar {
        background-color: var(--dark-primary-color);
        color: var(--dark-theme-text-color);
        opacity: var(--primary-text-opacity-light);
        --app-toolbar-font-size: var(--base-font-size, var(--default-font-size));
      }
      app-toolbar > *[main-title] {
        font-size: 1.5em;
        margin: 0 1em;
      }
      app-toolbar > * {
        font-size: 1.2em;
        margin: 0 1em;
      }
      app-toolbar > div#htmlGeneratorButtons {
        padding: 0 0.5em;
      }
      app-toolbar div paper-button {
        margin: 0 0.1em;
        background: var(--card-background-color);
      }
      app-toolbar div paper-button[toggles] {
        transition: background-color 0.3s;
      }
      app-toolbar div paper-button[toggles][active] {
        background-color: rgba(0, 0, 0, 0.2);
      }
      paper-slider {
        width: 100%;
        --paper-slider-input: {
          width: 8em;
        };
      }
      chart-track-group-list {
        --chart-track-list-items-mixin: {
          margin: 0.2em;
        };
      }
    </style>
    <!-- TODO: add paper-dropmenu for ref -->
    <app-drawer-layout fullbleed="">
      <app-drawer slot="drawer">
        <div class="layout vertical">
          <div class="flex layout vertical">
            <div id="coordinateHolder" class="layout vertical">
              <template is="dom-repeat" items="{{_coordinateObjectArray}}">
                <gene-coor-input ref="[[item.ref]]" label="[[_calcGeneCoorLabel(index)]]" floatinglabel="true" value="{{item.coor}}" invalid="[[item.invalid]]">
                </gene-coor-input>
              </template>
              <div class="layout horizontal end-justified" id="controlButtonGroup">
                <paper-button raised="" id="cancelUpdateChartButton" on-tap="resetTracks">
                  Cancel
                </paper-button>
                <paper-button class="colored" raised="" id="updateChartBtn" on-tap="update">
                  [[_calcUpdateButtonText(numOfSubs)]]
                </paper-button>
              </div>
            </div>
            <chart-track-list ref="[[ref]]" class="flex" id="mainTrackList" group-id-list="[[groupIdList]]" setting-key="visibility" has-controls="[[hasControls]]" with-filter="[[withFilter]]" instant-change="[[instantChange]]" show-selected-tracks="" selected-tracks-only="" collapsable="" priority-managers="{{priorityManagers}}">
            </chart-track-list>
            <custom-track-controller ref="[[ref]]" id="mainCTController">
            </custom-track-controller>
          </div>
        </div>
      </app-drawer>
      <div class="fit layout vertical">
        <app-toolbar id="mainToolbar">
          <paper-icon-button icon="menu" drawer-toggle="">
          </paper-icon-button>
          <div main-title="">[[titleText]]</div>
          <div class="tooltipMouseOver" id="navigationHelp">
            <iron-icon icon="icons:help"></iron-icon>
            How to navigate
          </div>
          <paper-tooltip fit-to-visible-bounds="" for="navigationHelp">
            To navigate GIVe:
            <ul>
              <li><em>Drag horizontally</em> on any tracks or the coordinates
                to move left / right
              </li>
              <li>Move mouse cursor <strong>onto the coordinates</strong> and
                <em>use mouse wheel</em> to zoom in / out.
              </li>
            </ul>
          </paper-tooltip>
          <slot id="additionalCtrls" name="toolBarCtrls"></slot>
        </app-toolbar>
        <div class="content flex layout vertical">
          <div class="flex relative">
            <chart-area ref="[[ref]]" id="mainChartArea" coordinate="{{coordinate}}" num-of-subs="{{numOfSubs}}" priority-managers="{{priorityManagers}}" pass-exceptions="">
            </chart-area>
          </div>
          <div class="dataReference">
            <slot id="reference" name="chartReference"></slot>
          </div>
        </div>
      </div>
    </app-drawer-layout>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class ChartController extends
    give.PriorityManagerCollectionEmbedMixin(PolymerElement)
  {
    constructor () {
      super()
      this._updatingRefCoordinates = false
    }
    static get is () {
      return 'chart-controller'
    }

    static get properties () {
      return {
        /**
         * Number of sub views in this controller.
         * Notice that if this setting is different from `coordinates.length`,
         * adjustments will be made to `coordinates` (truncating excessive
         * items or padding with default values).
         * @type {number}
         */
        numOfSubs: {
          type: Number,
          value: 1,
          notify: true
        },

        /**
         * Objects being passed into the text fields
         */
        _coordinateObjectArray: {
          type: Array,
          value () {
            return []
          }
        },

        /**
         * Coordinates of every view.
         * This is the value that can be specified by HTML attributes.
         * @type {Array<string>}
         */
        coordinate: {
          type: String,
          notify: true
        },

        ref: {
          type: String,
          notify: true
        },

        /**
         * The title text that will appear in the embedded browser.
         * @type {string}
         */
        titleText: {
          type: String,
          value: 'GIVE (Genomic Interaction Visualization Engine)'
        },

        /**
         * Whether the track controller will support filter function
         * @type {boolean}
         */
        withFilter: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the track controller will reflect change immediately
         * without calling this.syncDomToTrack().
         * This is always false if hasControls === true
         * @type {boolean}
         */
        instantChange: {
          type: Boolean,
          value: false
        },

        /**
         * Whether the track controller will not show OK/Cancel controls
         * @type {boolean}
         */
        hasControls: {
          type: Boolean,
          value: false
        }
      }
    }

    /**
      * Array of strings describing multi-property observer methods and their
      * dependant properties
      */
    static get observers() {
      return [
        '_numOfSubsRefCoordinateChanged(numOfSubs, ref, coordinate)'
      ]
    }

    // listeners: {
    //   'update-coordinate': '_updateCoordinateHandler',
    //   'update-track-dom': '_updateTrackDomHandler',
    //   'show-track-filter': '_showTrackFilterHandler',
    //   'filter-tracks': '_filterTracksHandler'
    // },

    // observers: [
    //   '_coordinateChanged(coordinates.splices)'
    // ],

    /**
     * Use for one-time configuration of your component after local DOM is
     * initialized.
     */
    ready () {
      super.ready()
      // this._numOfSubsRefCoordinateChanged()
      // give.RefObject.allRefPromise.then(() =>
      //   this._refArray.forEach(ref => {
      //     let refObj = give.RefObject.findRefByDb(ref)
      //     if (refObj && !this.priorityManagers.hasOwnProperty(ref)) {
      //       if (refObj) {
      //         this.priorityManagers[ref] = new give.PriorityManager(
      //           refObj, this.defaultTrackIdList, this.groupIdList)
      //       }
      //     } else if (refObj) {
      //       this.priorityManagers[ref].asyncReset(
      //         refObj, this.defaultTrackIdList, this.groupIdList)
      //       this.notifyPath('priorityManagers.' + ref)
      //     }
      //   })
      // )
      this.addEventListener('list-expand', e => this._expandList(e))
      this.addEventListener('list-collapse', e => this._collapseList(e))
      this.addEventListener('update-track-list',
        e => this._trackListUpdateHandler(e))
    }

    /**
     * _calcGeneCoorLabel - calculate the label for `<gene-coor-input>`
     *
     * @param  {number} index - The index of view window
     * @returns {string} The returned label
     */
    _calcGeneCoorLabel (index) {
      return 'Coordinate (or gene name)' +
        ((this._coordinateObjectArray && this._coordinateObjectArray.length > 1)
          ? ' for view #' + (index + 1) : '')
    }

    _calcUpdateButtonText (numOfSubs) {
      return 'Update coordinate' + (numOfSubs > 1 ? 's' : '')
    }

    _expandList (e) {
      let listElem = this.$.mainTrackList
      if (e && e.detail && e.detail.listElem) {
        listElem = e.detail.listElem
      }
      listElem.classList.remove('flex')
      listElem.classList.add('expanded')
    }

    _collapseList (e) {
      let listElem = this.$.mainTrackList
      if (e && e.detail && e.detail.listElem) {
        listElem = e.detail.listElem
      }
      listElem.classList.remove('expanded')
      listElem.classList.add('flex')
    }

    _trackListUpdateHandler (e) {
      if (this.$.mainChartArea) {
        return this.$.mainChartArea.update(null, null, true)
          .catch(err => this._errorHandler(err))
      }
      return Promise.resolve()
    }

    /**
     * Update the SVG component.
     *
     * Although all chart-controller properties are observed via Polymer and
     * will trigger updates in the views, imperative changes will not be
     * observed. Use this method to update all the views in the browser for
     * those changes manually.
     */
    updateChart () {
      if (this.$.mainChartArea) {
        try {
          var correctedVWindows = this.$.mainChartArea.refreshAll(
            this._coordinateObjectArray.map(function (coorObj) {
              return coorObj.coor
            }, this), this._threshold
          )
          this.coordinates = correctedVWindows
        } catch (e) {
          // This will happen if the value is not valid
          // TODO: Show the paper-input elements as invalid
          if (e.data.updatedCoors) {
            // update the coordinates that are changed
            e.data.updatedCoors.forEach(function (coor, index) {
              if (coor) {
                this._coordinateObjectArray[index].coor = coor
                this.coordinates[index] = coor
                this.notifyPath(['_coordinateObjectArray', index, 'coor'])
              } else {
                this._coordinateObjectArray[index].invalid = true
                this.notifyPath(['_coordinateObjectArray', index, 'invalid'])
              }
            }, this)
          }
        }
      }
    }

    update (forceDomUpdate) {
      // remove the invalid marks
      this._coordinateObjectArray.forEach((coordinateObj, index) => {
        coordinateObj.invalid = false
        // notify Polymer
        this.notifyPath(['_coordinateObjectArray', index, 'invalid'])
      })
      return this.updateChartDomAndTrack(forceDomUpdate)
    }

    updateChartDomAndTrack (forceDomUpdate) {
      if (this.$.mainTrackList) {
        return this.$.mainChartArea.update(
          null, null,
          this.$.mainTrackList.syncDomToTrackSettings() || forceDomUpdate,
          this._calcCoordinateArrayToJson(), true
        )
          .catch(err => this._errorHandler(err))
      }
      return Promise.resolve()
    }

    _resetTracks () {
      if (this.$.mainTrackList) {
        this.$.mainTrackList.syncTrackToDom()
      }
      this._syncCoordinateRefJsonToArray()
    }

    _updateTrackDomHandler (e) {
      return this.updateChartDomAndTrack(e.detail.forceDomUpdate)
    }

    _syncNumOfSubs (newNumOfSubs) {
      this._updatingRefCoordinates = true
      this.numOfSubs = newNumOfSubs
      this._updatingRefCoordinates = false
    }

    _calcCoordinateArrayToJson () {
      return JSON.stringify(
        this._coordinateObjectArray.map(coordinateObj => coordinateObj.coor)
      )
    }

    _syncCoordinateRefArrayToJson () {
      this._updatingRefCoordinates = true
      this.coordinates = this._calcCoordinateArrayToJson()
      this.ref = JSON.stringify(this._refArray)
      this._updatingRefCoordinates = false
    }

    _syncCoordinateRefJsonToArray () {
      let coordinates = give.getValueArray(this.coordinate, this.numOfSubs)
      let refArray = give.getValueArray(this.ref, this.numOfSubs)
      if (this._coordinateObjectArray) {
        this.splice('_coordinateObjectArray', 0)
        if (!give.arrayEqual(this._refArray, refArray)) {
          this._refArray = refArray
        }
        coordinates.forEach((coordinate, index) => {
          this.push('_coordinateObjectArray', {
            ref: refArray[index],
            coor: coordinate,
            invalid: false
          })
        })
      }
    }

    _numOfSubsRefCoordinateChanged (numOfSubs, ref, coordinate) {
      if (!this._updatingRefCoordinates) {
        return this._syncCoordinateRefJsonToArray()
      }
    }

    _refChanged (newValue, oldValue) {
      if (!this._updatingRefCoordinates) {
        return this._syncCoordinateRefJsonToArray()
      }
    }

    _errorHandler (err) {
      // some exception has happended during the conversion
      // throw an exception telling calling procedures
      if (err instanceof give.PromiseCanceler) {
        throw err
      }
      // TODO: gracefully handle the exception
    }
  }

  give.ChartController = ChartController
  window.customElements.define('chart-controller', give.ChartController)

  return give
})(GIVe || {})
