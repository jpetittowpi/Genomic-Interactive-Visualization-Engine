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

`<chart-area>` provides a Web Component element to interactively display genomic
data.

```html
<chart-area group-id-list='["genes", "singleCell"]' ref="mm10"></chart-area>
```

Although `<chart-area>` does not contain the navigational control elements as in `<chart-controller>`, users may still navigate by dragging and mouse-wheeling on the coordinates to move around.

Please refer to [`GIVe.RefEmbedMixin`](../ref-embed-mixin/index.html) for details on references used.

*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '../../../../@polymer/polymer/polymer-element.js';

import '../../../../@polymer/polymer/lib/elements/dom-if.js';
import '../../../../@polymer/polymer/lib/elements/dom-repeat.js';
import '../basic-func/basic-func.js';
import '../chart-window/chart-window.js';
import '../promise-aggregator/promise-aggregator.js';
import '../priority-manager/priority-manager.js';
import { IronResizableBehavior } from '../../../../@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '../track-object/tracks-header.js';
import '../tutorial-highlight/tutorial-highlight.js';
import '../../../../@polymer/paper-spinner/paper-spinner.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout.js';
import { afterNextRender } from '../../../../@polymer/polymer/lib/utils/render-status.js';
import '../give-styles.js';
import './give-track-styles.js';
import '../../../../@webcomponents/shadycss/entrypoints/apply-shim.js';
import { mixinBehaviors } from '../../../../@polymer/polymer/lib/legacy/class.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="chart-area">
  <template>
    <style include="give-shared-styles">
      :host {
        position: relative;
        overflow-x: hidden;
        overflow-y: auto;
        font-family: 'Roboto', Arial, Helvetica, sans-serif;
        display: block;
        margin: 0;
        @apply --layout-fit;
      }
      paper-material {
        @apply --layout-fit;
        @apply --layout-vertical;
        padding: 0.8em;
        overflow-x: hidden;
        overflow-y: auto;
      }
      div#windowHolding {
        padding: 0;
        width: 100%;
        @apply --layout-vertical;
        @apply --layout-flex;
      }
      .uninitialized {
        font-size: 16px;
      }
    </style>
    <style include="give-track-styles"></style>
    <template is="dom-if" if="[[!_readiness]]">
      <div id="loadingBlock">
        <paper-spinner id="loadingSpinner" alt="Loading card content" active\$="[[!_readiness]]"></paper-spinner>
      </div>
    </template>
    <paper-material>
      <div id="windowHolding" hidden\$="[[!_initialized]]">
        <template id="windowsHolder" is="dom-repeat" items="[[_chartWindowItems]]" index-as="index">
          <chart-window id="[[_calcChartWindowId(index)]]" coordinate="{{item.coordinate}}" index="[[index]]" total-windows="[[numOfSubs]]" default-track-id-list="[[item.defaultTrackIdList]]" group-id-list="[[item.groupIdList]]" ref="{{item.ref}}" text-margin="[[textMargin]]" track-gap="[[trackGap]]" text-size="[[textSize]]" first-run="{{_firstRun}}" show-tutorial="[[!index]]">
          </chart-window>
          <template is="dom-if" if="[[_calcChartWindowHasInBetween(index)]]">
            <div class="pinBetweenHolder" id="[[_calcChartWindowInBetweenId(index)]]">
            </div>
          </template>
        </template>
      </div>
      <div class="uninitialized" hidden\$="[[_initialized]]">
        Please select a region to display first.
      </div>
    </paper-material>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class WindowNotInitialized extends Error {
    constructor () {
      super(...arguments)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, WindowNotInitialized)
      }
    }
    toString () {
      return super.toString() + '\n' + this.stack
    }
  }

  /**
   * The actual chart area element, with potential multiple windows for
   *    side-by-side view
   */
  class ChartArea extends mixinBehaviors([
    IronResizableBehavior
  ], give.PriorityManagerCollectionEmbedMixin(PolymerElement)) {
    constructor () {
      super()
      this._resizeDebounceInt = this.constructor.DEFAULT_RESIZE_DEBOUNCE
      this._idEnforcedSet = new Set()
      this._chartWindows = []
      this._refArray = []
      this._coordinateArray = []
      this.updatePromise = null
      this._resizeDebouncePromise = null
    }

    static get is () {
      return 'chart-area'
    }

    static get properties () {
      return {
        /**
         * The view windows to display in the element.
         * The members of the properties should be `GIVE.ChromRegion` Objects
         * @type {object}
         */
        _chartWindowItems: {
          type: Array,
          value: function () {
            return []
          }
        },

        /**
         * The view windows to display in the element, in coordinate format.
         * This is for HTML attributes
         * @type {string}
         */
        coordinate: {
          type: String,
          notify: true,
          observer: '_coorChanged'
        },

        ref: {
          type: String,
          observer: '_refChanged'
        },

        /**
         * Number of sub views in this controller.
         * Notice that if this setting is different from `coordinates.length`,
         * adjustments will be made to `coordinates` (truncating excessive
         * items or padding with default values).
         */
        numOfSubs: {
          type: Number,
          value: 1,
          notify: true,
          observer: '_numOfSubsChanged'
        },

        passExceptions: {
          type: Boolean,
          value: false
        },

        _initialized: {
          type: Boolean,
          value: false
        },

        trackGap: {
          type: Number,
          value: 0.3 // unit is em
        },

        textSize: {
          type: Number,
          value: 12 // unit is px
        },

        textMargin: {
          type: Number,
          value: 100 // unit is px
        },

        allowEmptyCoordinates: {
          type: Boolean,
          value: false
        },

        /**
         * Flag to indicate whether the entire `chart-area` is ready
         * @type {boolean}
         */
        _readiness: {
          type: Boolean,
          value: false
        },

        /**
         * Flag to indicate whether this is the first time this `chart-area`
         * element is run
         * @type {boolean}
         */
        _firstRun: {
          type: Boolean,
          value: true
        }
      }
    }

    ready () {
      this._updatingCoordinates = true
      this._updatingRefs = true
      super.ready()
      this.addEventListener('iron-resize', e => this._onIronResize(e))
      if (!this.passExceptions) {
        this.addEventListener('give-warning', e => this._warningHandler(e))
        give.warningHandler = event => this._warningHandler(event)
      }
      this._windowPromiseAggregator = new give.PromiseAggregator(
        null, this.passExceptions ? null : err => this._windowErrHandler(err)
      )
    }

    get _childIsInitialized () {
      return this._chartWindows.every(window => window.initialized)
    }

    get _childWindowIsSet () {
      return this._coordinateArray.every(coordinate => !!coordinate)
    }

    _calcChartWindowId (index) {
      return (this.id || '') + this.constructor.CHART_WINDOW_ID_PREFIX + index
    }

    _calcChartWindowHasInBetween (index) {
      return index < this.numOfSubs - 1
    }

    _calcChartWindowInBetweenId (index) {
      return (this.id || '') + this.constructor.CHART_IN_BETWEEN_ID_PREFIX +
        index
    }

    _showErrorMessage (errObj, type) {

    }

    _windowErrHandler (err) {
      if (err instanceof give.ChartWindow.ResetWidthError) {
        throw err
      }
      if (!(err instanceof give.PromiseCanceler)) {
        give._verbConsole.warn(err)
        this._showErrorMessage(err, 'error')
      }
    }

    _errorHandler (err, catchWindowNotInitialized) {
      // throw give.PromiseCanceler to stop any current promise chain
      if (err instanceof give.PromiseCanceler) {
        throw err
      }
      if (err instanceof WindowNotInitialized && catchWindowNotInitialized) {
        give._verbConsole.info('Window not initialized')
        throw new give.PromiseCanceler()
      }
      if (!this.passExceptions) {
        // TODO: gracefully handle the exception
        this._showErrorMessage(err, 'error')
      }
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': ready (error)')
      this._readiness = true
      if (this.passExceptions) {
        throw err
      }
      return this._coordinateArray
    }

    _warningHandler (event) {
      event.stopPropagation()
      this._showErrorMessage(event.detail.errObj, 'warning')
    }

    _updateTrackWindowArray () {
      this.$.windowsHolder.render()
      this._chartWindows =
        [...this.$.windowHolding.querySelectorAll('chart-window')]
      // fill in-between windows
      this._chartWindows.forEach((window, index) => {
        if (window.hasInBetween) {
          this.shadowRoot.querySelector(
            '#' + this._calcChartWindowInBetweenId(index)
          ).appendChild(window.pinBetweenSlot)
        }
      })
    }

    _syncRefsJsonToArray (numOfWindows, newRefValue) {
      numOfWindows = numOfWindows || this.numOfSubs
      newRefValue = newRefValue || this.ref
      this._refArray = give.getValueArray(newRefValue, numOfWindows)
    }

    _syncCoordinatesJsonToArray (newCoorindateValue) {
      newCoorindateValue = newCoorindateValue || this.coordinate
      let refArray = null
      try {
        refArray = this._refArray.map(
          refName => give.RefObject.findRefByDb(refName)
        )
      } catch (ignore) { }
      this._coordinateArray = give.getValueArray(newCoorindateValue,
        this.numOfSubs,
        (!this.allowEmptyCoordinates && refArray)
          ? refArray.map((refObj, index) => {
            let defaultViewWindows = refObj.settings.defaultViewWindows
            return defaultViewWindows
              ? defaultViewWindows[index % defaultViewWindows.length]
              : null
          })
          : null
      )
    }

    getRefsReadyPromise () {
      return Promise.all(
        this._chartWindows.map(window => window.refReadyPromise).concat(
          this.priorityManagersReadyPromise
        )
      )
        // .then(() => {
        //   // these two lines were intended to fix wrong ref db names
        //   this._refArray = this._chartWindows.map(window => window.ref)
        //   this._syncRefsArrayToJson()

        //   // initialization of priority managers if not done already
        //   this._refArray.forEach(ref => {
        //     if (!this.priorityManagers.hasOwnProperty(ref)) {
        //       this.priorityManagers[ref] = new give.PriorityManager(
        //         give.RefObject.findRefByDb(ref),
        //         this.defaultTrackIdList,
        //         this.groupIdList)
        //     }
        //   })
        //   return Promise.all(
        //     this._refArray.map(ref => this.priorityManagers[ref].readyPromise))
        // })
        .then(() =>
          this._chartWindows.forEach(window => (
            window.priorityManager = this.priorityManagers[window.ref]
          ))
        )
    }

    _setRefsInWindow () {
      this._chartWindows.forEach(
        (window, index) => (window.ref = this._refArray[index]))
      return this.getRefsReadyPromise()
    }

    _expandChartWindows (newNumOfWindows) {
      let oldNumOfWindows = this._chartWindows.length
      for (let index = this._chartWindowItems.length;
        index < newNumOfWindows;
        index++
      ) {
        let newWindowItem = {
          ref: this._refArray[index],
          coordinate: this._coordinateArray[index]
        }
        this.push('_chartWindowItems', newWindowItem)
      }
      this._updateTrackWindowArray()
      for (let index = oldNumOfWindows;
        index < this._chartWindows.length;
        index++
      ) {
        this._chartWindows[index].addEventListener(
          'update-window',
          e => this._updateWindowHandler(e.detail, e.currentTarget.index)
        )
      }
    }

    _shrinkChartWindows (newNumOfWindows) {
      this.splice('_chartWindowItems', newNumOfWindows)
      this._updateTrackWindowArray()
    }

    _syncCoordinatesArrayToJson (coordinateArray) {
      this._coordinateArray = coordinateArray || this._coordinateArray
      this._updatingCoordinates = true
      this.coordinate = JSON.stringify(this._coordinateArray)
      this._updatingCoordinates = false
      return coordinateArray
    }

    _syncRefsArrayToJson () {
      this._updatingRefs = true
      this.ref = JSON.stringify(this._refArray)
      this._updatingRefs = false
    }

    _syncNumOfSubs (newNumOfSubs) {
      this._updatingNumOfSubs = true
      this.numOfSubs = newNumOfSubs
      this._updatingNumOfSubs = false
    }

    /**
     * _windowWidthChangeHandler - the function to handle the case
     *    when one of the chart-window child throws a new width because of
     *    the vertical scroll bar. After that all children have to adapt the
     *    new width to ensure consistency.
     * @param  {give.ChartWindow.ResetWidthError} err - The error object thrown
     *    by child with its `newWidth` property set to signal to parent that a
     *    width update is needed.
     * @return {Promise<undefined>} A promise that resolves when all the
     *    updating is completed. If the error is not
     *    give.ChartWindow.ResetWidthError, give a rejected promise for
     *    downstream code to catch.
     * @memberof ChartArea
     */
    _windowWidthChangeHandler (err) {
      if (err instanceof give.ChartWindow.ResetWidthError) {
        return this._windowPromiseAggregator.aggregate(
          this._chartWindows,
          (window, index) => window.updateTracks(false, err.newWidth)
        )
      }
      throw err
    }

    /**
     * _redrawWindows - redraw one or all children within this ChartArea.
     * @param  {function<ChartWindow, number>} redrawWindowMethod - The method
     *    to be called upon ChartWindow(s) to redraw them.
     * @param  {number|null} index - The index of the ChartWindow to be redrawn.
     *    If omitted, call `redrawWindowMethod` upon all children.
     * @return {Promise<Array<String>>} A promise that fulfills when redrawing
     *    is done. The value of the promise when fulfilled will the the array
     *    of corrected coordinates for all windows.
     * @memberof ChartArea
     */
    _redrawWindows (redrawWindowMethod, index) {
      if (!this._childIsInitialized || !this._childWindowIsSet) {
        return Promise.reject(new WindowNotInitialized())
      }
      this._initialized = true
      let newWindowPromise
      try {
        if (typeof index === 'number') {
          newWindowPromise = redrawWindowMethod(
            this._chartWindows[index], index
          )
        } else {
          newWindowPromise = this._windowPromiseAggregator.aggregate(
            this._chartWindows, redrawWindowMethod
          )
        }
        return newWindowPromise
          .then(correctedCoordinates => {
            let windowWidth = null
            let otherWidth
            if (this._chartWindows.every(window => {
              if (windowWidth === null) {
                windowWidth = window.windowWidth
              }
              otherWidth = window.windowWidth
              return windowWidth === otherWidth
            })) {
              return correctedCoordinates
            } else {
              throw new give.ChartWindow.ResetWidthError(
                this._chartWindows.some(window => window.hasScroll)
                  ? Math.min(windowWidth, otherWidth)
                  : Math.max(windowWidth, otherWidth)
              )
            }
          })
          .catch(err => this._windowWidthChangeHandler(err))
          .then(() => this._syncCoordinatesArrayToJson(this.chartCoordinates))
          .then(correctedCoordinates => {
            delete this.updatePromise
            give._verbConsole.info(this.id + ' @ ' + Date.now() + ': ready (normal)')
            afterNextRender(this,
              () => (this._readiness = true))
            return correctedCoordinates
          })
          .catch(err => this._errorHandler(err));
      } catch (err) {
        try {
          this._syncCoordinatesArrayToJson(this.chartCoordinates)
        } catch (ignore) { }
        return this._errorHandler(err)
      }
    }

    update (newNumOfSubs, newRef, updateDom, newCoordinates, forceRefresh) {
      if (newNumOfSubs && newNumOfSubs !== this.numOfSubs) {
        this.updatePromise =
          this.updateNumOfSubs(newNumOfSubs, newRef, newCoordinates)
      } else if (newRef && newRef !== this.ref) {
        this.updatePromise = this.updateRef(newRef, newCoordinates)
      } else if (updateDom) {
        this.updatePromise = this.updateDom(newCoordinates)
      } else if (newCoordinates && newCoordinates !== this.coordinate) {
        this.updatePromise = this.updateCoordinates(newCoordinates)
      } else if (forceRefresh) {
        this.updatePromise = this.updateTracks()
      }
      return this.updatePromise || Promise.resolve(this.chartCoordinates)
    }

    updateNumOfSubs (newNumOfSubs, newRef, newCoordinates) {
      this._initialized = false
      this._updatingRefs = true
      this._updatingCoordinates = true
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateNumOfSubs)')
      this._readiness = false
      if (newNumOfSubs && newNumOfSubs !== this.numOfSubs) {
        this._syncNumOfSubs(newNumOfSubs)
      }
      return Promise.resolve()
        // 1. First update the number of chart-windows
        //    Although this part is all sync code, put it into the async
        //    pipeline to streamline the exception catching process.
        .then(() => this._syncRefsJsonToArray(newNumOfSubs, newRef))
        .then(() => this._syncCoordinatesJsonToArray(newCoordinates))
        .finally(() => {
          if (newNumOfSubs > this._chartWindowItems.length) {
            // refresh hidden dom list
            this._expandChartWindows(newNumOfSubs)
          } else {
            // less window, remove the excessive ones
            this._shrinkChartWindows(newNumOfSubs)
          }
        })
        .then(() => this.getRefsReadyPromise())
        // 2. Reset all DOMs among windows (display and link),
        //    then update window contents.
        .then(() => this.updateDom(newCoordinates))
    }

    updateRef (newRef, newCoordinates) {
      this._initialized = false
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateRef)')
      this._readiness = false
      return Promise.resolve()
        .then(() => {
          this._syncRefsJsonToArray(null, newRef)
          return this.priorityManagersReadyPromise
        })
        .then(() => this._setRefsInWindow())
        .then(() => this.updateDom(newCoordinates))
    }

    updateDom (newCoordinates) {
      // Update the track DOMs within the chart-windows (because the
      // surrounding environment has changed, some of the tracks, especially
      // multi-window ones, may have its requirement conditions changed)
      let contexts = this._chartWindows.map(window => window.context)
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateDom)')
      this._readiness = false
      return Promise.all(
        this._chartWindows.map(window =>
          (window.initialized
            ? window.updateDom(contexts)
            : window.resetDom(contexts))
        )
      )
        // Then link the multi-window track DOMs through the chart-windows
        .then(() => this._chartWindows.reduce((hiddenDoms, window) =>
          window.linkDOMs(hiddenDoms, contexts, false), []))
        // Then update all the windows
        .then(() => this.updateTracks(newCoordinates))
    }

    updateCoordinates (newCoordinates) {
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateCoordinates)')
      this._readiness = false
      this._syncCoordinatesJsonToArray(newCoordinates)
      return this._redrawWindows((window, index) =>
        window.changeCoordinate(this._coordinateArray[index]))
    }

    updateTracks (newCoordinates) {
      give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateTracks)')
      this._readiness = false
      this._syncCoordinatesJsonToArray(newCoordinates)
      return this._redrawWindows((window, index) =>
        window.updateTracks(this._coordinateArray[index]))
    }

    /**
     * _numOfSubsChanged - sync number of viewWindows to `numOfSubs`
     *
     * @param  {number} newValue new `numOfSubs` value
     * @param  {number} oldValue old `numOfSubs` value
     */
    _numOfSubsChanged (newValue, oldValue) {
      if (!this._updatingNumOfSubs) {
        return this.updateNumOfSubs(newValue)
      }
    }

    _refChanged (newValue, oldValue) {
      if (!this._updatingRefs) {
        return this.updateRef(newValue)
      }
    }

    _coorChanged (newValue, oldValue) {
      if (!this._updatingCoordinates) {
        return this.updateCoordinates(newValue)
      }
    }

    _updateWindowHandler (detail, index) {
      // update the windows by events bubbled up from bottom tracks
      if (detail.newWindow instanceof give.ChromRegion ||
        typeof detail.newWindow === 'string'
      ) {
        if (detail.tracks || !this._initialized) {
          // needs to update Dom to match track visibility as well, so update
          //    the entire `chart-area` instead of only the window
          return this.updateDom()
        } else if (this._initialized) {
          let newCoordinate = detail.newWindow
          if (newCoordinate instanceof give.ChromRegion) {
            newCoordinate = newCoordinate.regionsToString(false)
          }
          if (newCoordinate !== this._chartWindows[index].coordinate) {
            give._verbConsole.info(this.id + ' @ ' + Date.now() + ': unready (updateWindowHandler)')
            this._readiness = false
            return Promise.resolve()
              .then(res => {
                let width = null
                this._chartWindows.some((window, winIndex) => {
                  if (winIndex !== index && window.hasScroll) {
                    width = window.windowWidth
                    return true
                  }
                })
                this._redrawWindows((window, index) =>
                  window.changeCoordinate(detail.newWindow, width), index)
              })
          }
        }
      }
    }

    updateWindowWidth (width) {
      this._readiness = false
      return this._redrawWindows((window, index) => window.changeWidth(width))
    }

    _onIronResize (e) {
      if (this._initialized && this._childIsInitialized) {
        if (!this._resizeDebouncePromise) {
          if (this._resizeDebounceInt) {
            this._resizeDebouncePromise = new Promise((resolve, reject) => {
              setTimeout(resolve, this._resizeDebounceInt)
            })
          } else {
            this._resizeDebouncePromise = Promise.resolve()
          }
          this._resizeDebouncePromise
            .then(() => {
              this._resizeDebouncePromise = null
              return this.updateWindowWidth()
            })
            .catch(err => this._errorHandler(err, true))
        }
      }
    }

    get chartCoordinates () {
      return this._chartWindows.map(window => window.coordinate)
    }
  }

  ChartArea.DEFAULT_RESIZE_DEBOUNCE = 400
  ChartArea.CHART_WINDOW_ID_PREFIX = '_chart-window-'
  ChartArea.CHART_IN_BETWEEN_ID_PREFIX = '_chart-in-between-'

  give.ChartArea = ChartArea
  window.customElements.define('chart-area', give.ChartArea)

  return give
})(GIVe || {})
