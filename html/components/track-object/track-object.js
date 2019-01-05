import '../basic-func/basic-func.js';
import './track-dom.js';
import './track-data-object.js';
/**
 * @license
 * Copyright 2017 GIVe Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var GIVe = (function (give) {
  'use strict'

  /**
   * Object representing a track,
   * contains its data component and visualization component.
   * @property {string} id - ID of track object
   * @property {string} groupID - ID of corresponding track group
   * @property {object} _settings - Settings of the track, in a dictionary
   * @property {object} _defaultSettings - defaultSettings upon initialization
   * @property {RefObjectLiteral} _refObj - Genome reference object of the track
   * @property {TrackDataObjectBase} _dataObj - The data object,
   *   should be an instance of `give.TrackDataObject` or its derived class
   *
   * @class TrackObject
   *
   * @constructor
   * @param {string} ID - The ID of the new track object
   * @param {object} Settings - Settings of the new track. Dictionary format.
   *   Note that if `Settings` has a property named `settings`,
   *   it will be merged with `this._settings`, while properties in
   *   `Settings.settings` take precedence in cases of conflict names
   * @param {RefObjectLiteral} refObj - the reference the track is using
   * @param {string} groupID - The group ID of the new track object
   */
  class TrackObject {
    constructor (ID, Settings, refObj, groupID) {
      this._id = ID
      this._groupID = groupID || ''
      Settings = Settings || {}
      // collapse settings object first
      //  (properties in Settings.settings take precedence)
      if (Settings.settings) {
        Settings = Object.assign(Settings, Settings.settings)
        delete Settings.settings
      }

      this._settings = Object.assign({}, Settings)
      this._initSettings()
      this._defaultSettings = Object.assign({}, this._settings)

      this._refObj = refObj
      this._dataObj = (typeof this.constructor._DataObjCtor === 'function')
        ? new this.constructor._DataObjCtor(this)
        : null
    }

    get refObj () {
      return this._refObj
    }

    get ref () {
      return this._refObj ? this._refObj.db : null
    }

    get windowSpan () {
      return this.getSetting('windowSpan') || this.constructor._getWindowSpan()
    }

    /**
     * _initSettings - Initialize settings for track object
     * This is used to set some flags from this._settings for compatibility
     * @memberof TrackObjectBase.prototype
     */
    _initSettings () {
      this.priority = (this.hasOwnProperty('priority')
        ? this.priority
        : (this.getSetting('priority') || TrackObject.DEFAULT_PRIORITY)
      )
      if (this.getSetting('visibility')) {
        this.visibility = this.getSetting('visibility')
      } // otherwise leave it to DOM
      if (this.windowSpan > 1 && !this.hasSetting('pin')) {
        this.setSetting('pin', 'inbetween')
      }
    }

    /**
     * getTitle - Get the track title information
     * Title is showing what the track is actually about. Currently it's
     * `<datatype>` [(`feature`)], e.g. 'ChIP-Seq (CTCF)'
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  the resulting title
     */
    get title () {
      // generate this.title (previously done by UCSC Browser core)
      if (this.getSetting('groupDataType')) {
        return this.getSetting('groupDataType') +
          (this.getSetting('groupFeature')
            ? ' (' + this.getSetting('groupFeature') + ')' : '')
      } else if (this.getSetting('dataType')) {
        return this.getSetting('dataType') +
          (this.getSetting('trackFeature')
            ? ' (' + this.getSetting('trackFeature') + ')' : '')
      }
      return this.getSetting('shortLabel') || ''
    }

    /**
     * getCleanLowerTitle - Get the track title,
     * removing blanks and other characters, then converting to lowercase
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  the resulting title
     */
    get cleanLowerTitle () {
      // generate this.title (previously done by UCSC Browser core)
      return this.title.replace(/[\s-]+/g, '').toLowerCase()
    }

    get tableNames () {
      // this is used to shield "super" tracks in the future
      return this.getSetting('track')
    }

    /**
     * getUcscVis - Get UCSC visibility string
     * Used to get a short string showing the visibility in UCSC format.
     * (Internally the visibility is stored as a number.)
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  UCSC visibility of the track
     */
    get ucscVis () {
      switch (this.getSetting('visibility')) {
        case TrackObject.StatusEnum.VIS_FULL:
          return 'full'
        case TrackObject.StatusEnum.VIS_DENSE:
          return 'dense'
        case TrackObject.StatusEnum.VIS_PACK:
          return 'pack'
        case TrackObject.StatusEnum.VIS_COLLAPSED:
          return 'collapsed'
        case TrackObject.StatusEnum.VIS_NOTEXT:
          return 'notext'
        default:
          return 'hide'
      }
    }

    _convertVisibilityValue (vis) {
      let visibilityValue
      // if vis === false, then save old visibility
      if (typeof vis === 'boolean') {
        if (!vis) {
          // needs to save current visibility
          this._oldVisibility = this._oldVisibility ||
            this.getSetting('visibility')
          visibilityValue = TrackObject.StatusEnum.VIS_NONE
        } else {
          visibilityValue = this._oldVisibility ||
            TrackObject.StatusEnum.VIS_FULL
          delete this._oldVisibility
        }
      } else if (typeof vis === 'number') {
        // is visibility value
        if (vis === TrackObject.StatusEnum.VIS_NONE) {
          // needs to save current visibility
          this.oldVisibility = this.oldVisibility ||
            this.getSetting('visibility')
        } else {
          delete this.oldVisibility
        }
        visibilityValue = vis
      } else if (typeof vis === 'string') {
        switch (vis.toLowerCase()) {
          case 'dense':
            visibilityValue = TrackObject.StatusEnum.VIS_DENSE
            break
          case 'pack':
            visibilityValue = TrackObject.StatusEnum.VIS_PACK
            break
          case 'collapsed':
            visibilityValue = TrackObject.StatusEnum.VIS_COLLAPSED
            break
          case 'notext':
            visibilityValue = TrackObject.StatusEnum.VIS_NOTEXT
            break
          case 'full':
            visibilityValue = TrackObject.StatusEnum.VIS_FULL
            break
          /**
           * NOTE: Default branch used to catch invalid values and use
           * fall-through to convert them to 'hide's.
           */
          default:
            give._verbConsole.warn('Invalid visibility value encountered: ' +
              '"' + vis + '". Used "hide" instead.')
            give.fireSignal('give-warning',
              {
                msg: 'Invalid visibility value encountered: ' +
                  '"' + vis + '". Use "hide" instead.'
              })
          // esline-disable-line no-fallthrough
          case 'hide':
            visibilityValue = TrackObject.StatusEnum.VIS_NONE
            break
        }
      } else if (typeof vis === 'undefined' || vis === null) {
        // use as toggle switch
        visibilityValue = !this.visibility
      }
      return visibilityValue
    }

    /**
     * setVisibility - Set the visibility of the track
     *
     * @memberof TrackObjectBase.prototype
     * @param  {boolean|string|number|undefined|null} vis The visibility.
     *   If `vis` is a `boolean`, `null` or `undefined`, it will work by
     *    toggling between the current non-`hide` visibility and `hide`.
     *    Current visibility will be saved in `this.oldVisibility`;
     *   If `vis` is a `number`, it just works as the internal values;
     *   If `vis` is a `string`, it will convert UCSC terms into internal
     *    numeric values.
     */
    set visibility (vis) {
      this._settings.visibility = this._convertVisibilityValue(vis)
      return this._settings.visibility
    }

    get visibility () {
      return this.getSetting('visibility')
    }

    get isVisible () {
      return this.visibility > this.constructor.StatusEnum.VIS_NONE
    }

    /**
     * setSetting - Set the setting value.
     *
     * @memberof TrackObjectBase.prototype
     * @param  {string} key - Key of the setting entry
     * @param  {object} value - value of the entry
     */
    setSetting (key, value) {
      // Visibility needs special treatment
      if (key === 'visibility') {
        this.visibility = value
      } else {
        this._settings[key] = value
      }
    }

    /**
     * setDefaultSetting - Set the default setting value.
     *
     * @memberof TrackObjectBase.prototype
     * @param  {string} key - Key of the setting entry
     * @param  {object} value - value of the entry
     */
    setDefaultSetting (key, value) {
      // Visibility needs special treatment
      if (key === 'visibility') {
        this._defaultSettings.visibility = value
      } else {
        this._defaultSettings[key] = value
      }
    }

    /**
     * resetSetting - Reset the setting to its default value
     * If the setting does not have default value, remove the setting entry
     * Notice that `this.priority` will not change, as well as some other
     * properties (such as `this.id`).
     *
     * @memberof TrackObjectBase.prototype
     * @param  {string} key - Key of the setting entry
     */
    resetSetting (key) {
      if (this._defaultSettings.hasOwnProperty(key)) {
        this.setSetting(key, this._defaultSettings[key])
      } else {
        delete this._settings[key]
      }
    }

    /**
     * resetAllSettings - Reset all settings to default values
     * Notice that `this.priority` will not change, as well as some other
     * properties (such as `this.id`).
     *
     * @memberof TrackObjectBase.prototype
     */
    resetAllSettings () {
      this._settings = Object.assign({}, this._defaultSettings)
      this._initSettings()
    }

    hasSetting (key) {
      return this._settings.hasOwnProperty(key)
    }

    /**
     * getSetting - get setting value
     *
     * @memberof TrackObjectBase.prototype
     * @param  {string} key - the key of the setting entry
     * @param  {string} type - the type of the setting entry
     * @returns {object} The value of the setting entry
     */
    getSetting (key, type) {
      // if(!this._settings.settings.hasOwnProperty(key)) {
      //  if(this._settings.hasOwnProperty(key)) {
      //    this._settings.settings[key] = this._settings[key];
      //  }
      // }
      // delete this._settings[key];
      if (key.toLowerCase() === 'title') {
        return this.title
      }
      switch (type) {
        case 'integer':
          return parseInt(this._settings[key])
        case 'number':
        case 'float':
          return parseFloat(this._settings[key])
        case 'boolean':
          switch (typeof this._settings[key]) {
            case 'string':
              // This is quite hard to handle because "yes", "true", "on", etc.
              return (this._settings[key].toLowerCase() === 'on' ||
                this._settings[key].toLowerCase() === 'true' ||
                this._settings[key].toLowerCase() === 'yes' ||
                this._settings[key].toLowerCase() === 'y' ||
                this._settings[key].toLowerCase() === 't'
              )
            default:
              return !!this._settings[key]
          }
        case 'string':
          return (this._settings[key] || '').toString()
        default:
          return this._settings[key]
      }
    }

    /**
     * getID - Get the ID of the track
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  The ID
     */
    get id () {
      return this._id
    }

    get groupID () {
      return this._groupID
    }

    /**
     * getReadableID - Get a human readable ID of the track,
     *   `_` will be replaced by ` `
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  Human readable ID
     */
    get readableID () {
      return this._id.replace(/_+/g, ' ')
    }

    /**
     * getType - Get the track type string.
     *   The track type string is inherited from UCSC, where the first keyword
     *   indicates the main track type (which can be retrieved by
     *   `this.typeTrunk`)
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  The track type string
     */
    get type () {
      return this.getSetting('type')
    }

    /**
     * getTypeTrunk - Get the track type keyword.
     *   This is used to get the lowercase keyword of the track type
     *   (see `this.type`).
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  The track type keyword
     */
    get typeTrunk () {
      return this.getSetting('type').split(/\s+/, 2)[0].toLowerCase()
    }

    /**
     * cleanId - Get the ID that conforms to HTML 4.1
     *   Brackets and spaces will be removed in ID.
     *   *Since HTML5 is being required now, this function has been deprecated
     *   and is retained for legacy uses only.*
     *
     * @memberof TrackObjectBase.prototype
     * @returns {string}  Cleaned ID
     */
    get cleanId () {
      // remove blanks and brackets in IDs to conform to HTML 4.1
      return this._id.replace(/[\s()+/]/g, '')
    }

    /**
     * getPriorities - Get the priority value of the track
     *   This value is changable at runtime and will affect the order of the track
     *     in `chart-area` element **within the same group**.
     *   Tracks with smaller priority will be put closer to the top of the view
     *     (if the view has its order reversed, then it will be closer to the
     *     bottom).
     *   Please refer to `give.ChartArea` for track orders
     *
     * @memberof TrackObjectBase.prototype
     * @returns {number}  The priority value
     */
    get priorities () {
      let priorities = []
      try {
        priorities.push(this.refObj.groups[this.groupID].priority)
      } catch (e) {
        priorities.push(Number.MAX_SAFE_INTEGER)
      }
      priorities.push(this.priority ? this.priority : Number.MAX_SAFE_INTEGER)
      return priorities
    }

    /**
     * fetchData - Get data for ranges at given resolutions, then call callback.
     *
     * @memberof TrackObjectBase.prototype
     * @param  {Array<ChromRegionLiteral>|ChromRegionLiteral} ranges -
     *   An array of `give.ChromRegion`s to get the data for.
     *   For each `ChromRegion` element, resolution can be individually
     *   assigned by setting `.resolution` property of the element.
     * @param  {string} callerID    The element ID calling `this.fetchData`,
     *   this is used to collapse multiple calls from the same element.
     * @returns {Promise<object>}  Returns a promise that resolves to an object
     *   with `callerID`s as key and the last committed range(s) as value.
     */
    fetchData (ranges, callerID) {
      if (this._dataObj && this._dataObj.fetchData) {
        return this._dataObj.fetchData(ranges, callerID)
      } else {
        let callerObj = {}
        callerObj[callerID] = ranges
        return Promise.resolve(callerObj)
      }
    }

    /**
     * getData - Get the actual `this._dataObj._DataStructure` object
     *    representing the underlying data. Underlying data are supposed to be
     *    ready when this method is called.
     * This method can be overriden to accept `null` if needed
     *
     * @param  {string} chrom The chrom to be requested
     * @returns {this._dataObj._DataStructure|null}       the underlying data
     *    (or `null` if no data for the track)
     */
    getData (chrom) {
      if (this._dataObj) {
        return this._dataObj.getData(chrom)
      }
      return null
    }

    /**
     * createDomObj - Create a DOM Object from this track.
     *   The DOM Object will need to handle all display issues separately but
     *   connects to `this` for data retrieval and other issues.
     *
     * @param  {object} prop - Properties to be passed on to the DOM Object
     * @returns {give.TrackDOMBehavior}      - The DOM Object
     */
    createDomObj (prop) {
      if (typeof this.constructor._DomObjCtor === 'function') {
        return new this.constructor._DomObjCtor(this, prop)
      } else {
        return null
      }
    }

    /**
     * checkViewReq - Check whether the given view window contexts meet the
     *    requirement of this track. This is used to determine if the track
     *    should be displayed at the specific view window.
     * Notice that for cross-species tracks, the ref criteria should be
     *    modified accordingly in the implementation.
     *
     * @param {Array<object>} contexts - The contexts of the viewWindows to be
     *    queried. It should contain two properties: <string> ref - the
     *    reference of the window; <number> index - the index of the window.
     * @param {number} index - The index of the viewWindow to show this track.
     * @returns {boolean} Whether this track should be shown in the view
     *    window under the given window contexts.
     * @memberof TrackObject
     */
    checkViewReq (contexts, index) {
      if (this.windowSpan <= 1) {
        return true
      } else if (contexts.length < index + this.windowSpan) {
        return false
      }
      for (let i = index; i < contexts.length; i++) {
        if (contexts[i] && contexts[i].ref !== this.ref) {
          return false
        }
      }
      return true
    }

    /**
     * ********** Static Properties for TrackObject Below **********
     */

    /**
     * createCoorTrack - Create a coordinate track for given reference
     *
     * @static
     * @param  {RefObjectLiteral} refObj Reference for the coordinate track
     * @param  {string} id  ID of the coordinate track
     *   If no ID is specified, `'coor_' + refObj.db` will be used as ID
     * @returns {TrackObjectBase}     The resulting track object
     */
    static createCoorTrack (refObj, id) {
      return this.createTrack(id || 'coor_' + refObj.db,
        { type: 'coordinate', priority: 0, noData: true, visibility: 'full' },
        refObj)
    }

    /**
     * createTrack - Create a track object by its type
     *
     * @param  {string} ID       ID of the track, see constructor
     * @param  {object} Settings Settings to be passed, see constructor
     * @param  {RefObjectLiteral} refObj      Reference, see constructor
     * @param  {string} type     The type of the track
     * @param  {string} groupID     The group ID of the track
     * @returns {TrackObjectBase}          returned TrackObject
     */
    static createTrack (ID, Settings, refObj, type, groupID) {
      try {
        type = type || Settings.type || Settings.settings.type
        type = type.split(/\s+/, 2)[0].toLowerCase()
      } catch (ignore) { }
      if (this.typeMap && this.typeMap.hasOwnProperty(type)) {
        return new this.typeMap[type](ID, Settings, refObj, groupID)
      } else {
        give._verbConsole.warn('Type \'' + type + '\' is not a valid type! ')
        give.fireSignal('give-warning',
          { msg: 'Type \'' + type + '\' is not a valid type! ' })
        return new this.typeMap._default(ID, Settings, refObj, groupID)
      }
    }

    /**
     * registerTrack - Register this track by its type trunk
     *
     * @param  {TrackObjectBase} trackImpl Implementation of track,
     *    `trackImpl.typeList` (notice that this is __not__
     *    `trackImpl.prototype.type`, which is a non-static property)
     *    will be called to get the key value(s)
     * @returns {boolean}     Return true if there is no implementation with the
     *    same key(s), otherwise false
     */
    static registerTrack (trackImpl) {
      var keys = trackImpl.typeList
      if (!Array.isArray(keys)) {
        keys = [keys]
      }
      var result = keys.every(key => !this.typeMap.hasOwnProperty(key))
      keys.forEach(key => { this.typeMap[key] = trackImpl })
      return result
    }

    /**
     * _getWindowSpan - Get the number of windows for the track to span across
     * @static
     *
     * @return {number} number of windows this track will span across
     */
    static _getWindowSpan () {
      return 1
    }

    static comparePriorities (track1, track2) {
      let prior1 = track1.priorities
      let prior2 = track2.priorities
      if (prior1 instanceof give.EffectivePriority ||
        prior2 instanceof give.EffectivePriority
      ) {
        return give.EffectivePriority.compare(prior1, prior2)
      }
      for (let i = 0; i < prior1.length; i++) {
        if (prior1[i] !== prior2[i]) {
          return Math.sign(prior1[i] - prior2[i])
        }
      }
      return 0
    }
  }

  /**
   * ********** Static properties of `TrackObject` below **********
   */

  /**
   * Enum for track visibility values.
   * @static
   * @readonly
   * @enum {number}
   */
  TrackObject.StatusEnum = {
    /**
     * Full visibility. Show the most amount of details for the track.
     */
    VIS_FULL: 5,
    /**
     * Show lots of details for the track. Pack the information together if
     * possible.
     */
    VIS_PACK: 4,
    /**
     * Show some details for the track. Pack the information together if
     * possible. Some information may be collapsed.
     */
    VIS_COLLAPSED: 3,
    /**
     * Show some details for the track. Pack the information together if
     * possible. Some information may be collapsed. Text labels will be omitted.
     */
    VIS_NOTEXT: 2,
    /**
     * Show as few details for the track as possible. Only minimum details
     * is shown to provide essential information for the track.
     */
    VIS_DENSE: 1,
    /**
     * Hide the track. Do not show in the browser.
     */
    VIS_NONE: 0
  }

  /**
   * @property {number} DEFAULT_PRIORITY - The default values for priorities
   * @static
   */
  TrackObject.DEFAULT_PRIORITY = 100.0

  /**
   * typeMap - a dictionary where all the implementations should register.
   * To register, put the type string as `key`, derived TrackObject as `value`.
   * e.g. `TrackObject.typeMap['bed'] = give.BedTrack`
   */
  TrackObject.typeMap = {
    _default: TrackObject
  }

  /**
   * ********** Virtual Methods to Be Implemented in Tracks Below **********
   */

  /**
   * @memberof TrackObjectBase
   * The constructor for actual data object being used in this track.
   */
  TrackObject._DataObjCtor = null

  /**
   * @memberof TrackObjectBase
   * The constructor for actual DOM object being used in this track.
   */
  TrackObject._DomObjCtor = null

  give.TrackObject = TrackObject

  return give
})(GIVe || {})
