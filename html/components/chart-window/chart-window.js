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
import { PolymerElement } from '../../../../@polymer/polymer/polymer-element.js';

import '../../../../@polymer/polymer/lib/elements/dom-if.js';
import '../basic-func/basic-func.js';
import '../track-object/tracks-header.js';
import '../ref-embed-mixin/ref-embed-mixin.js';
import '../tutorial-highlight/tutorial-highlight.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout.js';
import '../give-styles.js';
import '../chart-area/give-track-styles.js';
import { GestureEventListeners } from '../../../../@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import { afterNextRender } from '../../../../@polymer/polymer/lib/utils/render-status.js';
import '../../../../@webcomponents/shadycss/entrypoints/apply-shim.js';
import { html } from '../../../../@polymer/polymer/lib/utils/html-tag.js';
import { addListener } from '../../../../@polymer/polymer/lib/utils/gestures.js';
var GIVe = (function (give) {
  'use strict'

  class ResetWidthError extends Error {
    constructor (newWidth) {
      super(...arguments)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ResetWidthError)
      }
      this.newWidth = newWidth
    }
    toString () {
      return super.toString() + '\n' + this.stack + '\nNew width:' +
        this.newWidth
    }
  }

  /**
   * ### Overview
   *
   * `<chart-window>` provides a Web Component element to interactively display
   * genomic data.
   *
   * ```html
   * <chart-window group-id-list='["genes", "singleCell"]' ref="mm10">
   * </chart-window>
   * ```
   *
   * Although `<chart-window>` does not contain the navigational control
   * elements as in `<chart-controller>`, users may still navigate by dragging
   * and mouse-wheeling on the coordinates to move around.
   *
   * Please refer to
   * [`GIVe.RefEmbedMixin`](../ref-embed-mixin/index.html) for details
   * on references used.
   *
   * ### Managing Track Priorities
   *
   * `<chart-window>` will manage track order once a view has been generated.
   * Its behavior regarding to track order will be discussed within this
   * section.
   *
   * #### Before generating a view
   *
   * `<chart-window>` shall receive an ordered list of all visible tracks from
   * its embedded `refObject`, the visibility of tracks will be supplied by its
   * `defaultTrackIdList` property, or (if said property is not set) by the
   * default `visibility` property of individual tracks.
   *
   * When the visibility of tracks have been determined, `refObject` will
   * provide a sorted list (by relative `priorities` property of the tracks) of
   * visible tracks to start with.
   *
   * #### Populating the view with tracks
   *
   * Once `<chart-window>` receives the ordered list of visible tracks, it will:
   * *   Assign every track's `trackDom`'s `<svg>` element into its
   *     corresponding slot (`top`, `scroll`, `bottom`, and `inbetween`) by
   *     inserting it into the corresponding DOM node. Notice that if this
   *     window is the last window in the view, the slots and track order will
   *     be reversed to preserve a certain degree of symmetry.
   * *   Keep record of the relative order for every `<svg>` element within its
   *     own slot.
   *     Every track object will have an __`effective priority`__ value consists
   *     of its slot allocation (`top`, `scroll`, `bottom`, and `inbetween`)
   *     and its position within the slot.
   * *   Assign the `y` property for every `<svg>` when drawing the DOM element
   *     so that it appears in the correct order regardless of its order in the
   *     DOM tree.
   *
   * #### Modifying the track list and its effect on track order
   *
   * ##### Adding new tracks
   *
   * This action may only come from the parent element.
   *
   * When a new track is being added to the visible list, it will be allocated
   * to its corresponding slot but __added to the very end of the list__. The
   * `effective priority` value of the new track will be set if not done yet.
   *
   * ##### Removing a track
   *
   * This action may come from the parent element or from the `<chart-window>`
   * itself (via a "delete" button, to be implemented).
   *
   * When an existing track is being removed, it will be delisted from the slot,
   * the `trackDom` object will be put into a recycled list (previous recycled
   * list will be cleared) and all the `visibility` values and `effective
   * priority` values will be updated accordingly.
   *
   * If this action comes from the `<chart-window>` itself, notify its parent
   * about this change.
   *
   * ##### Restoring a track previously removed (proposed, to be implemented)
   *
   * This action may only come from the parent element.
   *
   * When a restoring command was received, all `trackDom`s in the recycled list
   * will be restored to their corresponding location, their `track`'s
   * `visibility` properties and `effective priority` values will be adjusted.
   * After that, the recycled list will be cleared.
   *
   * ##### Changing the location of a track
   *
   * This action may come from the parent element or from the `<chart-window>`
   * itself (via drag-drop, to be implemented).
   *
   * The `effective priority` will be updated to the new locations if the action
   * comes from `<chart-window>` itself (this happens when user tries to alter
   * the order of the tracks).
   *
   * Then the actual `svg` `y` values will be updated to reflect the new
   * location.
   *
   * If this action comes from the `<chart-window>` itself, notify its parent
   * about this change.
   *
   * @customElement
   * @polymer
   * @appliesMixin give.RefEmbedMixin
   */
  class ChartWindow extends
    give.RefEmbedMixin(GestureEventListeners(PolymerElement)) {
    static get template() {
      return html`
    <style include="give-shared-styles">
      :host {
        position: relative;
        overflow-x: hidden;
        overflow-y: auto;
        font-family: 'Roboto', Arial, Helvetica, sans-serif;
        display: block;
        margin: 0;
        padding: 0;
        width: 100%;
        @apply --layout-vertical;
        @apply --layout-flex;
      }
      div {
        margin: 0;
        padding: 0;
        border: none;
      }
      div.pinnedParts {
        @apply --layout-start;
        overflow: hidden;
      }
      div.scrollingParts {
        @apply --layout-flex;
        overflow-x: hidden;
        overflow-y: auto;
      }
      div#chartHolder {
        @apply --layout-vertical;
        @apply --layout-flex;
      }
      div#chartHolder > div {
        font-size: 0;
      }
      div#chartHolder > div > * {
        font-size: var(--base-font-size, var(--default-font-size));
      }
    </style>
    <style include="give-track-styles"></style>
    <div id="chartHolder">
      <div class="pinnedParts">
        <svg class="svgHolder" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" id="_PinTop">
        </svg>
      </div>
      <div class="scrollingParts" id="scrollingContainer">
        <svg class="svgHolder" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" id="_Scroll">
        </svg>
      </div>
      <div class="pinnedParts">
        <svg class="svgHolder" version="1.1" baseProfile="full" xmlns="http://www.w3.org/2000/svg" id="_PinBottom">
        </svg>
      </div>
    </div>
    <template is="dom-if" if="[[showTutorial]]">
      <tutorial-highlight id="coorTrackTutorial" tutorial-key="coor-track-tutorial" dom-target-id="[[_coorDomSvgId]]">
        <div>
          You may use mouse wheel within the coordinate track to zoom in/out,
          drag any track to move.
        </div>
      </tutorial-highlight>
    </template>
`;
    }

    constructor () {
      super()
      this._trackDoms = []
      this._hiddenTrackDoms = []
      this._addedTrackMap = new Map()
      this._hiddenTrackDomMap = new Map()

      this._pendingVWindow = null
      this._viewWindow = null
    }

    static get is () {
      return 'chart-window'
    }

    static get properties () {
      return {
        /**
         * The view windows to display in the element.
         * The members of the properties should be `GIVE.ChromRegion` Objects
         * @type {GIVe.ChromRegion}
         */
        _viewWindow: {
          type: Object
        },

        index: {
          type: Number,
          value: 0
        },

        totalWindows: {
          type: Number,
          value: 1
        },

        _coorDomSvgId: {
          type: String,
          value: ''
        },

        /**
         * The view window to display in the element, in coordinate format.
         * This is for HTML attributes
         */
        coordinate: {
          type: String,
          notify: true,
          observer: '_coorChanged'
        },

        _initialized: {
          type: Boolean,
          value: false
        },

        trackGap: Number,
        textSize: Number,
        textMargin: Number,

        /**
         * Promise resolved to the current `viewWindow` when the entire
         * `chart-window` is ready.
         * When resolved, this value will be set to `null`
         * @type {Promise}
         */
        drawingPromise: {
          type: Object,
          value: null
        },

        /**
         * Flag to indicate whether this is the first time this `chart-area`
         * element is run
         * @type {boolean}
         */
        firstRun: {
          type: Boolean,
          notify: true
        },

        showTutorial: {
          type: Boolean,
          value: false
        },

        priorityManager: {
          type: Object
        }
      }
    }

    ready () {
      this._updatingCoor = true
      super.ready()
      // initialize this._viewWindows from this.coordinates
      this._trackPromiseAggregator = new give.PromiseAggregator(
        null, err => this._trackErrHandler(err)
      )

      this._svgList = [...this.shadowRoot.querySelectorAll('.svgHolder')]

      this.syncInBetweenSlot()
    }

    connectedCallback () {
      super.connectedCallback()
      afterNextRender(this, () => {
        this.windowWidth = this.$.chartHolder.clientWidth
        // if (this.coordinate) {
        //   this.changeCoordinate(this.coordinate)
        // }
        // if (!this._initialized) {
        //   Promise.resolve().then(() => this._initDomAfterVWinRefReady())
        // }
      })
    }

    get reverseFlag () {
      return this.index > 0 && this.index === this.totalWindows - 1
    }

    get initialized () {
      return this._initialized
    }

    get context () {
      return {
        ref: this.ref,
        index: this.index
      }
    }

    get hasInBetween () {
      return this.index < this.totalWindows - 1
    }

    get hasScroll () {
      return this.$.scrollingContainer.clientHeight <
        this.$.scrollingContainer.scrollHeight
    }

    syncInBetweenSlot () {
      let inBetweenIndex = this._svgList.indexOf(this._pinBetweenSlot)
      if (this.hasInBetween) {
        if (!this._pinBetweenSlot) {
          this._pinBetweenSlot = document.createElementNS(
            this.constructor.svgNS, 'svg'
          )
        }
        if (inBetweenIndex < 0) {
          this._svgList.push(this._pinBetweenSlot)
        }
      } else {
        if (inBetweenIndex >= 0) {
          this._svgList.splice(inBetweenIndex, 1)
        }
        if (this._pinBetweenSlot) {
          while (this._pinBetweenSlot.firstChild) {
            this._pinBetweenSlot.removeChild(this._pinBetweenSlot.firstChild)
          }
        }
      }
    }

    get pinBetweenSlot () {
      return this.hasInBetween ? this._pinBetweenSlot : null
    }

    /**
     * Merge properties together
     * @todo Will be changed into `track-dom-behavior` or `basic-funcs`
     *
     * @param  {object} original - original object
     * @param  {object} newProp - object with new properties
     * @returns {object} object with the merged properties
     */
    _mergeProperty (original, newProp) {
      for (var key in newProp) {
        if (newProp.hasOwnProperty(key)) {
          original[key] = newProp[key]
        }
      }
      return original
    }

    _createTrackProp (props) {
      props = props || {}
      props.windowIndex = this.index
      props.reverseFlag = this.reverseFlag
      props.width = this.$.chartHolder.clientWidth
      props.textMargin = this.textMargin
      return props
    }

    _getSvgSlotId (trackDom) {
      return this._svgSlotIdFromSlotName(
        this._getDomEffectivePriority(trackDom).slotName
      )
    }

    _svgSlotIdFromSlotName (slotName) {
      slotName = slotName || ''
      switch (slotName.toLowerCase()) {
        case 'top':
          return this.reverseFlag ? '_PinBottom' : '_PinTop'
        case 'bottom':
          return this.reverseFlag ? '_PinTop' : '_PinBottom'
        case 'inbetween':
          return '_PinBetween'
        case 'scroll':
        default:
          return '_Scroll'
      }
    }

    _slotNameFromSvgSlotId (svgSlotId) {
      switch (svgSlotId.toLowerCase()) {
        case '_pintop':
          return this.reverseFlag ? 'bottom' : 'top'
        case '_pinbottom':
          return this.reverseFlag ? 'top' : 'bottom'
        case '_pinbetween':
          return 'inbetween'
        case '_scroll':
        default:
          return 'scroll'
      }
    }

    _getDomEffectivePriority (trackDom) {
      return this.priorityManager.getEffectivePriority(trackDom.parent)
    }

    _findSlotSvgElement (svgSlotId) {
      if (svgSlotId !== '_PinBetween') {
        return this.shadowRoot.querySelector('#' + svgSlotId)
      } else {
        return this.pinBetweenSlot
      }
    }

    _addTrackDomSvg (trackDom) {
      let svgSlotId = this._getSvgSlotId(trackDom)
      // Add DOM element
      this._findSlotSvgElement(svgSlotId).appendChild(trackDom.trackSvg)
      // attach event listeners (if any)
      if (trackDom.mainGestureReceiver && trackDom.dragHandler) {
        addListener(trackDom.mainGestureReceiver,
          'track', e => trackDom.dragHandler(e, e.detail)
        )
        trackDom.mainGestureReceiver.addEventListener(
          'wheel', e => trackDom.wheelHandler(e, e.detail)
        )
      }
      return svgSlotId
    }

    _addVisibleTrack (track, contexts, props) {
      if (track.checkViewReq(contexts, this.index)) {
        let newTrackDom = track.createDomObj(this._createTrackProp(props))
        this._addTrackDomSvg(newTrackDom)
        if (!this._coorDomSvg && newTrackDom instanceof give.CoorTrackDom) {
          this._coorDomSvg = newTrackDom.trackSvg
        }
        return newTrackDom
      }
      return null
    }

    _addHiddenTrackDom (trackDom) {
      if (trackDom && !this._hiddenTrackDomMap.has(trackDom.id) &&
        trackDom.hasLinksInTargetView(this.context)
      ) {
        this._hiddenTrackDoms.push(trackDom)
        this._hiddenTrackDomMap.set(trackDom.id, trackDom)
        return trackDom
      }
      return null
    }

    _removeHiddenTrackDom (trackDomId) {
      if (trackDomId && this._hiddenTrackDomMap.has(trackDomId)) {
        this._hiddenTrackDoms.splice(
          this._hiddenTrackDoms.indexOf(
            this._hiddenTrackDomMap.get(trackDomId)
          ), 1)
        this._hiddenTrackDomMap.delete(trackDomId)
      }
    }

    _moveTrackDom (trackDom, newIndex, oldIndex) {
      // TODO: send signal to parent DOM element indicating the change
    }

    _removeTrackDom (trackDom) {
      // TODO: send signal to parent DOM element indicating the change
    }

    _clearDOM () {
      // clear out all the svgs
      this._svgList.forEach(svgElem => {
        while (svgElem.firstChild) {
          svgElem.removeChild(svgElem.firstChild)
        }
      }, this)
      // clear `this._trackDoms`
      this._trackDoms.length = 0
    }

    updateSvgHeightLocation (width) {
      // update width and throw width if needed
      width = width || this.$.chartHolder.clientWidth

      this._svgList.forEach(svgElem => {
        svgElem.setAttribute('width', width)
        svgElem.setAttribute('height', svgElem._currY || 0)
        svgElem.setAttribute('viewBox',
          '0 0 ' + width + ' ' + (svgElem._currY || 0))
        delete svgElem._currY
      })
      if (this.$.scrollingContainer.clientWidth < width) {
        throw new ResetWidthError(
          this.$.scrollingContainer.clientWidth
        )
      }
      this.windowWidth = width
    }

    /**
     * @function updateTracks
     * @async
     * @param  {ChromRegionLiteral} newVWindow - Whether the view window needs
     *    to be changed to the new window, if this is falsey, then the
     *    function will call itself on pending view window or the original
     *    window.
     * @param  {number} [width] - If a new width is need to be specified
     * @return {Promise<ChromRegionLiteral>} Returns a Promise that resolves
     *    to the new window when new data was ready.
     * @throws {number} if width needs to be changed (due to scroll bar), the
     *    new width will be thrown to let the calling function (in
     *    `chart-area`) be informed of incoming width change.
     */
    updateTracks (newVWindow, width) {
      // Steps:
      // * Update all tracks' width and height (with maybe new view window)
      // * Calculate whether a scroll bar will be needed and rearrange all
      //   the svg elements by changing the Y value
      //   (by calculating and setting the height of the svgHolder element)
      //   * If a scroll bar is needed, throw the width with scroll bar
      //     factored in. Process ends to wait for the next call from the
      //     parent element (`chart-area`).
      // * Resolve the promise to the new view window
      give._verbConsole.info(
        'updateTracks(' + width + ', ' + newVWindow + ')')

      if (typeof newVWindow === 'string') {
        newVWindow = this.getVerifiedViewWindow(newVWindow)
      }
      // prepare element widths and heights
      this._pendingVWindow = newVWindow || this._pendingVWindow || false
      this._updateCoordinates()

      width = width || this.$.chartHolder.clientWidth

      // Update all tracks' width and height (with maybe new view window)
      // If no new promise is needed, do not chain stuff afterwards
      this.drawingPromise = this._trackPromiseAggregator.aggregate(
        this._trackDoms.concat(this._hiddenTrackDoms),
        trackDom => trackDom.update(
          this._pendingVWindow, width, null, false, this.index)
      )
        // * Calculate whether a scroll bar will be needed
        //   (by calculating and setting the height of the svgHolder element)
        //   * If a scroll bar is needed, throw the width with scroll bar
        //     factored in. Process ends to wait for the next call from the
        //     parent element (`chart-area`).
        .then(windows => this._trackReadyHandler(windows, width))

      return this.drawingPromise
    }

    changeWidth (width) {
      if (!this._initialized) {
        return this.resetDom().then(() => this.changeWidth(width))
      }
      width = width || this.$.chartHolder.clientWidth
      if (this._viewWindow && this.windowWidth && width !== this.windowWidth) {
        let pendingVWindow = this._viewWindow.getExtension(
          (width - this.windowWidth) / this.windowWidth,
          null, true, this._refObj
        )
        return this.updateTracks(pendingVWindow, width)
      }
      return Promise.resolve(this._viewWindow)
    }

    _showTutorialIfNeeded () {
      if (this.firstRun && this.showTutorial &&
        this._coorDomSvg
      ) {
        this._coorDomSvgId = this._coorDomSvg.id
        this.shadowRoot.querySelector('#coorTrackTutorial').showTutorial()
      }
      this.firstRun = false
    }

    _updateTrackLocation (newWidth) {
      let enumArray = this.reverseFlag
        ? this._trackDoms.slice().reverse() : this._trackDoms
      enumArray.forEach(trackDom => {
        let svgElem = this._findSlotSvgElement(
          this._getSvgSlotId(trackDom, true)
        )
        if (svgElem.hasOwnProperty('_currY')) {
          svgElem._currY += this.trackGap * this.textSize
        } else {
          svgElem._currY = 0
        }
        trackDom.updateLocation(0, svgElem._currY)
        svgElem._currY += trackDom.height
      })
      this.updateSvgHeightLocation(newWidth)
    }

    _verifyTrackUpdateWindow (trackWindow, trackIndex, pendingVWindow) {
      if (this._trackDoms.length <= trackIndex) {
        return true
      }
      if (Array.isArray(trackWindow)) {
        trackWindow =
          trackWindow[this.index - this._trackDoms[trackIndex].windowIndex]
      }
      return !give.ChromRegion.compare(trackWindow, pendingVWindow)
    }

    _trackReadyHandler (windows, newWidth) {
      // First check whether other resizing event fired before
      // this update (otherwise the display may not be up-to-date).
      let pendingVWindow = this._pendingVWindow || this._viewWindow
      if (pendingVWindow && Array.isArray(windows) && windows.some(
        (window, index) =>
          !this._verifyTrackUpdateWindow(window, index, pendingVWindow)
      )) {
        throw new give.PromiseCanceler()
      }
      // update `this._viewWindow` and clear `this.drawingPromise`
      // `windows` is the array returned by Promise.all()
      this._trackPromiseAggregator.clear()
      delete this.drawingPromise
      this._viewWindow = pendingVWindow
      this._pendingVWindow = null
      this._updateTrackLocation(newWidth)
      // call tutorial elements if needed
      try {
        this._showTutorialIfNeeded()
      } catch (e) {
        give._verbConsole.warn(e)
        give.fireSignal('give-warning', { errObj: e }, null, this)
      } finally {
        this._readiness = true
      }
      return this._viewWindow
    }

    _trackErrHandler (err) {
      if (err && err.critical) {
        throw err
      }
      if (!(err instanceof give.PromiseCanceler)) {
        give._verbConsole.warn(err)
        give.fireSignal('give-warning', { errObj: err })
      }
      return this._pendingVWindow || this._viewWindow
    }

    getVerifiedViewWindow (coordinate) {
      try {
        // This may throw some exceptions
        // (when invalid view windows are supplied)
        return new give.ChromRegion(coordinate, this.refObj)
      } catch (err) {
        // Invalid view windows are supplied, fail gracefully
        err.data = err.data || {}
        err.data.updatedCoor =
          (this._viewWindow &&
            this._viewWindow.regionToString
          ) ? this._viewWindow.regionToString(false) : null
        throw err
      }
    }

    /**
     * _changeViewWindow - Change the range of a sub view.
     *    The range should be a `GIVE.ChromRegion` object and clipped.
     *    No exceptions should be thrown from this function.
     *
     * @param  {ChromRegionLiteral} viewWindow - The target range
     * @param  {number} [width] - The width of the window
     * @return {Promise<ChromRegionLiteral>} A Promise that resolves to the
     *    updated view window when the updating is done.
     * @throws {number} if width needs to be changed (due to scroll bar), the
     *    new width will be thrown to let the calling function (in
     *    `chart-area`) be informed of incoming width change.
     * @async
     */
    changeViewWindow (viewWindow, width) {
      if (!this._initialized) {
        return this.resetDom(viewWindow)
          .then(() => this.updateTracks(viewWindow, width))
      }
      return this.updateTracks(viewWindow, width)
    }

    _coorChanged (newValue, oldValue) {
      if (!this._updatingCoor) {
        return this.changeCoordinate(newValue)
      }
    }

    changeCoordinate (newCoordinate, width) {
      try {
        let newWindow = this.getVerifiedViewWindow(newCoordinate)
        let currWindow = this._pendingVWindow || this._viewWindow
        if (!currWindow || give.ChromRegion.compare(currWindow, newWindow)) {
          return this.changeViewWindow(newWindow, width)
        }
        return this._pendingVWindow ? Promise.reject(new give.PromiseCanceler())
          : Promise.resolve(this._viewWindow)
      } catch (err) {
        err.data = err.data || {}
        err.data.updatedCoor =
          (this._viewWindow && this._viewWindow.regionToString)
            ? this._viewWindow.regionToString(false) : null
        this._updateCoordinates()
        throw err
      }
    }

    _updateCoordinates (window) {
      window = window || this._pendingVWindow || this._viewWindow
      if (window) {
        this._updatingCoor = true
        this.coordinate = window.regionToString(false)
        this._updatingCoor = false
      }
    }

    /**
     * Get the `string` of ranges in all views
     *
     * @returns {Array<string>} The ranges, converted to `string`.
     */
    getViewWindowString () {
      return this._viewWindows.map(function (vwindow, index) {
        return vwindow.regionToString(false)
      }, this)
    }

    _setRefObj (refObj) {
      let result = super._setRefObj(refObj)
      if (result) {
        this._initialized = false
      }
      // return this.refReadyPromise.then(refObj => {
      //   if (refObj.db !== this.ref) {
      //     // Only respond to this call if ref has not been changed
      //     throw new give.PromiseCanceler()
      //   }
      //   give.fireSignal('ref-changed', {
      //     ref: refObj.db,
      //     index: this.index
      //   }, null, this)
      //   this._initDomAfterVWinRefReady()
      // })
      return result
    }

    /**
     * Reset the entire DOM display without updating the DOM
     * @async If reference has not have its tracks initialized.
     */
    resetDom (contexts) {
      contexts = contexts || []
      let refReadyPromise = Promise.resolve()
      if (!this._initialized) {
        if (this.refObj) {
          refReadyPromise = this.refObj.initTracks().then(() => {
            this._initialized = true
          })
        } else {
          this._updateCoordinates()
          throw new give.GiveError('Reference not initialized.')
        }
      }
      return refReadyPromise.then(() => {
        this._clearDOM()
        this._readiness = false
        return this._updateAllTrackDoms(contexts)
      })
    }

    /**
     * link hidden DOMs to the window
     * @param  {Array<TrackDom>} hiddenDoms - The hidden DOM to be linked
     *    within this window
     * @param  {Array<object>} contexts - The contexts views the DOMs in
     *    this window will be linked to. contexts object should have the
     *    following properties:
     *    {
     *      ref: <string> reference of the view
     *      index: <number> index of the view
     *    }
     *    This array should at least include the neighboring windows with
     *    the same index as in `chart-area`
     * @returns {Array<TrackDom>} An array of hidden Track DOMs that needs to be
     *    linked to lower windows.
     */
    _linkHiddenDoms (hiddenDoms, contexts) {
      // add all hiddenDoms (if not already added)
      // and if they need to be further linked, put into returned list
      if (hiddenDoms && hiddenDoms.length) {
        hiddenDoms.forEach(
          hiddenDom => this._addHiddenTrackDom(hiddenDom)
        )
        return hiddenDoms.filter(hiddenDom =>
          hiddenDom.hasLinksInTargetView(contexts[this.index + 1])
        )
      } else {
        return []
      }
    }

    _updateAllTrackDoms (contexts) {
      let newTrackDoms = []
      let newAddedTrackMap = new Map()
      this.priorityManager.trackIdList.forEach(trackId => {
        let newTrackDom
        if (this._addedTrackMap.has(trackId)) {
          newTrackDom = this._addedTrackMap.get(trackId).trackDom
        } else {
          newTrackDom = this._addVisibleTrack(
            this.refObj.tracks.get(trackId), contexts
          )
        }
        if (newTrackDom) {
          newTrackDoms.push(newTrackDom)
          newAddedTrackMap.set(trackId, {
            trackDom: newTrackDom,
            slotId: this._addTrackDomSvg(newTrackDom)
          })
        }
      })
      this._addedTrackMap.forEach((slotAndDom, trackId) => {
        if (!newAddedTrackMap.has(trackId)) {
          this._findSlotSvgElement(slotAndDom.slotId)
            .removeChild(slotAndDom.trackDom.trackSvg)
        }
      })
      this._trackDoms = newTrackDoms
      this._addedTrackMap = newAddedTrackMap
    }

    _removeInvisibleTrackDoms (contexts) {
      // Find tracks from `this._trackDoms` that become invisible now
      // then call `this._removeTrack` to remove them
      let removedTracks = this._trackDoms.map(trackDom => trackDom.parent)
        .filter(track => (
          !track.isVisible || !track.checkViewReq(contexts, this.index)
        ))
      this._removeTrack(removedTracks)
    }

    /**
     * @function updateDom - Update the DOM structure of the window WITHOUT
     *    REFRESHING THE CONTENTS (so that this function can be kept sync).
     *    This should be always called when `this._initialized` is `true`,
     *    otherwise `this.resetDom` (an async function) should be used.
     * @param  {Array<object>} contexts - Contexts for neighboring windows
     *    to check if multi-window tracks should be displayed.
     */
    updateDom (contexts) {
      // update existing DOMs
      contexts = contexts || []
      return this._updateAllTrackDoms(contexts)
    }

    /**
     * @function linkDOMs - link DOMs within this window with those within
     *    neighboring windows.
     * @param  {Array<trackDom>} hiddenDoms - The hidden DOM to be linked
     *    within this window
     * @param  {Array<object>} contexts - The contexts views the DOMs in
     *    this window will be linked to. contexts object should have the
     *    following properties:
     *    {
     *      ref: <string> reference of the view
     *      index: <number> index of the view
     *    }
     *    This array should at least include the neighboring windows with
     *    the same index as in `chart-area`
     * @param  {Boolean} keepOldLinks - Whether to keep the old hidden DOMs
     *    (for performance purposes)
     * @return {Array<trackDom>} Return the DOMs that will be linked within
     *    the next view
     */
    linkDOMs (hiddenDoms, contexts, keepOldLinks) {
      contexts = contexts || []
      if (!keepOldLinks) {
        // remove all existing hidden DOMs to severe old links
        this._hiddenTrackDomMap.clear()
        this._hiddenTrackDoms.length = 0
      }
      let linkedDoms = this._linkHiddenDoms(hiddenDoms, contexts) || []

      return linkedDoms.concat(this._trackDoms.filter(trackDom =>
        trackDom.hasLinksInTargetView(contexts[this.index + 1])))
    }
  }

  ChartWindow.ResetWidthError = ResetWidthError
  ChartWindow.svgNS = 'http://www.w3.org/2000/svg'

  give.ChartWindow = ChartWindow
  window.customElements.define('chart-window', give.ChartWindow)

  return give
})(GIVe || {})
