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

First, `import` everything needed to implement a new track.
*/
/*
Then import all other dependencies (omit if none is needed).
*/
/*
Finally, all the components are either `import`ed (HTML file) or put in
`<script></script>` tags (JS files).
*/
/* <script src="bigWigReader.js"></script> */
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../track-object.js';

import '../../basic-func/external-libs.js';
import '../../chrom-region/chrom-region.js';
import '../../give-tree/trees/pine-tree.js';
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
   * Object representing a BiwWig track data object,
   * see `GIVe.TrackDataObject` for details.
   *
   * ## Response entries from remote servers for bigWig tracks
   *
   * All entries should contain a `regionString` property saying its coverage,
   * and a `data` object for actual data.
   * For raw data, only `value` is needed (for actual signal strength over
   * the region of `regionString`):
   * ```
   * {
   *   'regionString': 'chr10:12345-67890',
   *   'data': {
   *     `value`: <value>
   *   }
   * },
   * ```
   * For summary data, it should contain all properties of a summary, see
   * `give.BigWigSummaryCtor` for details:
   * ```
   * {
   *   'regionString': 'chr10:12345-67890',
   *   'data': {
   *     `validCount`: <valid_count>,
   *     `sumData`: <sum_data>,
   *     `sumSquares`: <sum_of_data_squares>,
   *     `minVal`: <minimum_value>,
   *     `maxVal`: <maximum_value>
   *   }
   * },
   * ```
   *
   * @typedef {object} BigWigTrackData
   * @class give.BigWigTrackData
   *
   * @constructor
   * @implements TrackDataObjectBase
   * @param {TrackObjectBase} parent - The track object parent
   */
  class BigWigTrackData extends give.TrackDataObject {
    /**
     * _readLocalFile - read a local file representing the track
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {string} fileName - name of the file
     * @async
     * @returns {Promise} returns a promise that resolves to the file content.
     */
    _readLocalFile (fileName) {
      return new Promise((resolve, reject) => {
        let reader = new window.FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsArrayBuffer(fileName)
      })
    }

    /**
     * _fileHandler - This should be the detailed implementation about how to
     *    handle local files
     *
     * @param  {string} localFile - Path of the local file
     * @param  {Array<ChromRegionLiteral>} regions - Query regions, including
     *   potential resolutions
     */
    _fileHandler (result, regions) {
      let bigWig = new give.BigWigFile(result)
      // bigWig.readAll();
      bigWig.readSection(regions)
      let datapoints = bigWig.datapoints
      return this._dataHandler(datapoints, regions)
    }
  }

  /**
   * BigWigSummaryCtor - Constructor of summary data for bigWig tracks
   * @constructor
   *
   * @class BigWigSummaryCtor
   * @implements SummaryCtorBase
   *
   * @property {number} validCount - the number of valid counts (nucleotides)
   *    with signal
   * @property {number} sumData - the sum value of all signals
   * @property {number} sumSquares - the sum of square values of all signals
   * @property {number} minVal - the minimum value of all signals
   * @property {number} maxVal - the maximum value of all signals
   * @property {number} value - the 'value' of this summary data, should be
   *    `this.sumData / this.validCount`
   */
  class BigWigSummaryCtor extends give.SummaryCtorBase {
    constructor (chrRegion, oldSummary) {
      super(...arguments)
      if (oldSummary) {
        this.validCount = oldSummary.validCount || 0
        this.sumData = oldSummary.sumData || 0
        this.sumSquares = oldSummary.sumSquares || 0
        this.minVal = (
          typeof oldSummary.minVal === 'number' && !isNaN(oldSummary.minVal))
          ? oldSummary.minVal : Number.POSITIVE_INFINITY
        this.maxVal = (
          typeof oldSummary.maxVal === 'number' && !isNaN(oldSummary.maxVal))
          ? oldSummary.maxVal : Number.NEGATIVE_INFINITY
        this.value = (this.validCount > 0 ? this.sumData / this.validCount : 0)
      } else {
        this.validCount = 0
        this.sumData = 0
        this.sumSquares = 0
        this.minVal = 0
        this.maxVal = 0
        this.value = 0
      }
    }

    /**
     * testDataEntry - test whether the response entry is a summary or not.
     *    Because responses may contain raw data or summaries, this is needed
     *    to distinguish the two types.
     *
     * @static
     * @param  {object} entry - the response entry object converted from JSON
     * @returns {boolean} `true` if the response entry is a summary, `false`
     *    otherwise.
     */
    static _testRespEntry (entry) {
      return (entry.data && entry.data.hasOwnProperty('validCount'))
    }

    /**
     * addSummary - add summary data to this summary.
     *    This is mainly used to summarize over a series of summaries.
     *
     * @param  {GiveNonLeafNode} node    - the non-leaf node this summary is for
     * @param  {SummaryCtorBase} summary - the summary to be added
     */
    addSummary (node, summary) {
      this.sumData += summary.sumData
      this.sumSquares += summary.sumSquares
      this.minVal = (this.validCount > 0 && this.minVal <= summary.minVal)
        ? this.minVal : summary.minVal
      this.maxVal = (this.validCount > 0 && this.maxVal >= summary.maxVal)
        ? this.maxVal : summary.maxVal
      this.validCount += summary.validCount
      this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
    }

    /**
     * addData - add raw data entry to this summary
     *    This is mainly used to summarize over raw data entries.
     *
     * @param  {GiveNonLeafNode} node - the non-leaf node this summary is for
     * @param  {object} data - the raw data object to be added
     */
    addData (node, data) {
      this.sumData += data.value * node.length
      this.sumSquares += data.value * data.value * node.length
      this.minVal = (this.validCount > 0 && this.minVal <= data.value)
        ? this.minVal : data.value
      this.maxVal = (this.validCount > 0 && this.maxVal >= data.value)
        ? this.maxVal : data.value
      this.validCount += node.length
      this.value = this.validCount > 0 ? this.sumData / this.validCount : 0
    }
  }

  BigWigTrackData._DataStructure = give.PineTree
  BigWigTrackData._SummaryCtor = BigWigSummaryCtor

  give.BigWigTrackData = BigWigTrackData

  return give
})(GIVe || {})
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
 *
 * ### Overview
 *
 * `<bigwig-track-dom>` is the Web Component to display BigWig tracks. It's part
 * of `GIVe.BigWigTrack` object and is used to visualize data from the
 * `GIVe.BigWigTrack` object.
 *
 * ### Visibility level
 *
 * ### References
 * *   [`GIVe.TrackObject`](../index.html) for details on tracks in
 * general;
 * *   [`GIVe.BigWigTrack`](./bed-track/index.html) for details on BED
 * track implementation;
 * *   [Polymer element registration](https://www.polymer-project.org/1.0/docs/devguide/registering-elements)
 * for Polymer Element guide, including lifecycles, properties, methods and others.
 */
var GIVe = (function (give) {
  'use strict'

  class BigWigTrackDom extends give.TrackDom {
    constructor (track, props) {
      super(...arguments)
      /**
       *  A simple calculation of where the top and bottom of where to draw the track is.
       */
      this.drawingBoundary = {
        top: this.margin,
        bottom: this.height - this.margin
      }

      this.labelMarginRight = this.margin + this.textRightPadding

      if (!(this.windowMax > this.windowMin)) {
        give._verbConsole.warn(
          'Window Range Error: windowMax = ' +
          this.windowMax + '; windowMin = ' + this.windowMin
        )
        give.fireSignal('give-warning',
          {
            msg: 'Window Range Error: windowMax = ' +
              this.windowMax + '; windowMin = ' + this.windowMin
          }, null, this)
        this.windowMax = this.constructor.defaultProperties.windowMax
        this.windowMin = this.constructor.defaultProperties.windowMin
      }

      this.dataPoints = []
    }

    _initProperties (props) {
      super._initProperties(props)
      /**
       * The overall margin for displaying, in px.
       * @type {number}
       */
      this.margin = this._initPropertyItem(
        'margin', props, 'margin', 'float')

      /**
       * The color index for the text, should be an integer
       * @type {number}
       */
      this.textColorIndex = this._initPropertyItem(
        'textColorIndex', props, 'textColorIndex', 'integer')

      /**
       * The color index for overflow (orange), should be an integer
       * @type {number}
       */
      this.overflowColorIndex = this._initPropertyItem(
        'overflowColorIndex', props, 'overflowColorIndex', 'integer')

      /**
       * The width of the line that is used for the overflow
       * @type {number}
       */
      this.overflowStrokeWidth = this._initPropertyItem(
        'overflowStrokeWidth', props, 'overflowStrokeWidth', 'integer')

      /**
       * The size of the text used in axis labels
       * @type {number}
       */
      this.scaleTextSize = this._initPropertyItem(
        'scaleTextSize', props, 'scaleTextSize', 'integer')

      /**
       * Minimum resolution required per pixel, used to determine how fine
       * the data should be retrieved
       * @type {number}
       */
      this.minResolutionPerPixel = this._initPropertyItem(
        'minResolutionPerPixel', props, 'minResolutionPerPixel', 'integer')

      /**
       * The upper bound for the track display. Any values above this will be
       * displayed as a overflow line.
       * @type {number}
       */
      this.windowMax = this._initPropertyItem(
        'windowMax', props, 'windowMax', 'float')

      /**
       * The lower bound for the track display. One might think that this is
       * obviously zero, but in some cases there are actually negative intensity
       * values at a point.
       * @type {number}
       */
      this.windowMin = this._initPropertyItem(
        'windowMin', props, 'windowMin', 'float')

      /**
       * The length of ticks in axes.
       * @type {number}
       */
      this.scaleTickLength = this._initPropertyItem(
        'scaleTickLength', props, 'scaleTickLength', 'float')

      /**
       * Whether or not to automatically scale the window bounds according to
       * the data displayed.
       */
      this.autoScale = this._initPropertyItem(
        'autoScale', props, 'autoScale', 'boolean')

      /**
       * Whether or not to include zero when doing auto scaling.
       * @type {boolean}
       */
      this.includeZero = this._initPropertyItem(
        'includeZero', props, 'includeZero', 'boolean')

      /**
       * When auto scaling, the upper bound will be chosen at this proportion of
       * data. Everything above this proportion will be put above the upper
       * display boundary.
       *
       * This takes a float value between 0 and 1, where 0 means no data will be
       * put out of the boundary.
       * @type {number}
       */
      this.upperProportion = this._initPropertyItem(
        'upperProportion', props, 'upperProportion', 'float')

      /**
       * When auto scaling, the lower bound will be chosen at this proportion of
       * data. Everything below this proportion will be put below the lower
       * display boundary.
       *
       * This takes a float value between 0 and 1, where 0 means no data will be
       * put out of the boundary.
       * @type {number}
       */
      this.lowerProportion = this._initPropertyItem(
        'lowerProportion', props, 'lowerProportion', 'float')

      /**
       * Number of digits to show on axes labels, should be an integer
       * @type {number}
       */
      this.numOfDigits = this._initPropertyItem(
        'numOfDigits', props, 'numOfDigits', 'integer')

      /**
       * Half width of sliding window, in pixel. Should be an integer.
       *
       * For example, to use a 5-pixel sliding window, set this value to 2.
       * @type {number}
       */
      this.slidingWindowHalfWidth = this._initPropertyItem(
        'slidingWindowHalfWidth', props, 'slidingWindowHalfWidth', 'integer')
    }

    _getResolution (newVWindow, index) {
      let width =
        (typeof this._pendingWindowWidth === 'number' &&
          this._pendingWindowWidth > 0)
          ? this._pendingWindowWidth : this.windowWidth
      return Math.max(Math.floor(
        newVWindow.length / width /
        this.minResolutionPerPixel
      ), 1)
    }

    get windowRange () {
      return this.windowMax - this.windowMin
    }

    _pushSingleRawPointEntry (
      dataPointArray, chrRange, dataEntry
    ) {
      // start is the end of the last entry in dataPointArray
      // or chrRange.start
      let start = chrRange.start
      let lastElem = dataPointArray[dataPointArray.length - 1]
      if (lastElem && lastElem.end) {
        // lastElem is a ChromRegion object, may need to add some data
        if (lastElem.overlaps(dataEntry) > 0) {
          lastElem.data.value += dataEntry.data.value *
            lastElem.overlaps(dataEntry) / lastElem.length
        }
        start = lastElem.end
      }
      if (start < dataEntry.end) {
        let span = Math.max(parseInt(chrRange.resolution) || 1, 1)
        let chrSpan = new give.ChromRegion({
          chr: chrRange.chr,
          start: start,
          end: start + span
        })
        while (chrSpan.start < dataEntry.end &&
          chrSpan.start < chrRange.end
        ) {
          // This will insert 0 in the gaps, split value in overlaps
          // and have full value afterwards
          let newData = chrSpan.clone()
          newData.data = {
            value: dataEntry.data.value * newData.overlaps(dataEntry) /
              newData.length
          }
          dataPointArray.push(newData)
          chrSpan.move(span)
        }
      }
    }

    _generateRawPointsList (vwindow) {
      let rawDataPoints = []
      // First populate the raw data points
      this.parent.getData(vwindow.chr).traverse(vwindow,
        entry => this._pushSingleRawPointEntry(rawDataPoints, vwindow, entry),
        null, false)
      // Insert more zeroes to the end
      let lastEnd = rawDataPoints.length
        ? rawDataPoints[rawDataPoints.length - 1].end
        : vwindow.start
      while (lastEnd < vwindow.end) {
        rawDataPoints.push(new give.ChromRegion({
          chr: vwindow.chr,
          start: lastEnd,
          end: lastEnd + vwindow.resolution
        }, this.parent.ref, { data: { value: 0.0 } }))
        lastEnd += vwindow.resolution
      }
      return rawDataPoints
    }

    _generateSmoothedPoints () {
      // Get the smoothing points
      let vwindow = this.viewWindow
      let slidingWindowSpan = this._getResolution(vwindow) *
        this.slidingWindowHalfWidth * this.minResolutionPerPixel
      let halfWindowIndexLength = Math.ceil(this.slidingWindowHalfWidth *
        this.minResolutionPerPixel / 2)
      let extendedWindow = vwindow.getExtension(slidingWindowSpan)
        .clipRegion(this.parent.ref)
      extendedWindow.resolution = this._getResolution(vwindow)

      // Get the raw points list first
      let rawDataPoints = this._generateRawPointsList(extendedWindow)

      // Then smooth out with this.slidingWindowHalfWidth
      // Needs to check if the borders do not have enough points

      // Prepare for the sliding sumData
      let smoothedPointsList = []

      for (let currIndex = 0; currIndex < rawDataPoints.length; currIndex++) {
        let slidingSum = 0
        let windowElemCount = 0
        for (let i = -halfWindowIndexLength; i <= halfWindowIndexLength; i++) {
          if (rawDataPoints[currIndex + i]) {
            slidingSum += rawDataPoints[currIndex + i].data.value
            windowElemCount++
          }
        }
        smoothedPointsList.push(new give.ChromRegion({
          chr: vwindow.chr,
          start: rawDataPoints[currIndex].start,
          end: rawDataPoints[currIndex].end
        }, this.parent.ref, { data: { value: slidingSum / windowElemCount } }))
      }
      return smoothedPointsList
    }

    _findAutoScale () {
      this.windowMax = this.includeZero ? 0 : Number.NEGATIVE_INFINITY
      this.windowMin = this.includeZero ? 0 : Number.POSITIVE_INFINITY
      try {
        let extremities = give._findQuantile(this.dataPoints.map(
          function (dataEntry) {
            return dataEntry.data.value
          }, this), this.upperProportion, this.lowerProportion)
        if (this.windowMax < extremities.upper) {
          this.windowMax = extremities.upper
        }
        if (this.windowMin > extremities.lower) {
          this.windowMin = extremities.lower
        }
      } catch (ignore) {
      }
      if (!(this.windowMax > this.windowMin)) {
        this.windowMax = 1
        this.windowMin = 0
      }
    }

    drawData () {
      // default drawing mode is 0 (sliding window smoothing)
      let mode = parseInt(give.getParameterByName('mode') || 0)
      // draw the given point with height determined by signal strength
      this.clear()
      let vwindow = this._mainSvg.viewWindow
      if (this.parent.getData(vwindow.chr)) {
        this.dataPoints = this._generateSmoothedPoints()
        if (this.autoScale) {
          this._findAutoScale()
        }
        if (mode === 0) {
          this.drawPeak(this.dataPoints)
        }
        if (mode === 1) {
          this.bSpline()
        }
        if ((mode === 2) || (mode === 3)) {
          this.newBCurve()
        }
      }
      this.drawScale()
    }

    /**
     * anonymous function - transforms a signal strength into a y coordinate on the svg.
     *
     * @param  {type} signal signal strength
     * @param  {type} flags  has two booleans
     * @return {type}        returns the y coordinate
     */
    transformYCoordinate (signal, flags) {
      // transform Y coordinate from signal with this.windowMin and
      //   this.windowMax
      // notice that if the value exceeds either boundary,
      // it will return the Y value at the boundary, but will mark
      //   flags.EXCEED_MAX or flags.EXCEED_MIN as true
      // (flags needs to be an object from the caller to receive such values)
      flags = flags || {}
      delete flags.EXCEED_MIN
      delete flags.EXCEED_MAX // clear flags first
      if (signal > this.windowMax) {
        flags.EXCEED_MAX = true
        return this.drawingBoundary.top
      } else if (signal < this.windowMin) {
        flags.EXCEED_MIN = true
        return this.drawingBoundary.bottom
      }
      return (signal - this.windowMax) / (this.windowMin - this.windowMax) *
        (this.drawingBoundary.bottom - this.drawingBoundary.top) +
        this.drawingBoundary.top
    }

    /**
     * Draws the horizontal thick, different colored lines where the values go
     *    further than the window ranges.
     *
     * @param  {type} overflows the list of overflow areas
     * @return {type}           description
     */
    drawOverflowLines (overflows) {
      let drawOverflowRectFunc = (y, region) => {
        this.drawRectangle(region,
          this.constructor.colorSet[this.overflowColorIndex],
          y, this.overflowStrokeWidth, this._mainSvg)
      }
      overflows.exceedMax.forEach(region => drawOverflowRectFunc(0, region))
      overflows.exceedMin.forEach(region => drawOverflowRectFunc(
        this.height - this.overflowStrokeWidth, region))
    }

    /**
     * anonymous function - Adds a point from the dataEntry to the datapoints.
     *
     * @param  {type} dataEntry holds many points, just not in the correct format (yet).
     * @return {type}           description
     */
    addPoint (vwindowChr, dataEntry) {
      // var x = dataEntry.start
      // var y = dataEntry.end
      // var z = dataEntry.data instanceof give.TrackObjectImpl._BigWigImpl._SummaryCtor
      //   ? dataEntry.data.sumData / dataEntry.length : dataEntry.data.value
      // var vwindow = this._mainSvg.viewWindow
      this.parent.data[vwindowChr].dataPoints.push(dataEntry)
    }
    // another function called draw splines? which converts the four bezier  points to scale on the svg and draws them as a curve?
    // use svg function

    drawBCurve (bPoints) {
      var svgToDraw = this._mainSvg
      var BCurve = document.createElementNS(this.svgNS, 'path')
      BCurve.setAttribute('d', 'M' + bPoints[0][0] + ' ' + bPoints[0][1] + ' C ' + bPoints[1][0] + ' ' + bPoints[1][1] + ' ' + bPoints[2][0] + ' ' + bPoints[2][1] + ' ' + bPoints[3][0] + ' ' + bPoints[3][1])// use c for the rest
      BCurve.setAttribute('stroke', 'black')
      BCurve.setAttribute('fill', 'transparent')
      this.addElement(BCurve, svgToDraw)
    }
    drawDownLine (x, y) {
      var svgToDraw = this._mainSvg
      var DownLine = document.createElementNS(this.svgNS, 'line')
      DownLine.setAttribute('x1', x)
      DownLine.setAttribute('x2', x)
      DownLine.setAttribute('y1', y)
      DownLine.setAttribute('y2', 0)
      DownLine.setAttribute('stroke', 'black')
      this.addElement(DownLine, svgToDraw)
    }
    bSpline (points) {
      // for each (four?) points: calculate the tripmid point things, store them as p1.t2 , p2.t1, p2.t2, p3.t1, p3.t2, p4.t1
      // calculate the midpoints of each connected trimidpoint pair, store as p2.m, p3.m
      // calculate input the points as bezier: p2.m, p2.t2, p3.t1, p3.m, with the middle two as control points.
      // this should take points and bspline it?    ToDo: create separate functions for regular average and bspline, to switch between them easily.
      var vwindow = this._mainSvg.viewWindow
      var windowToDraw = this._mainSvg.viewWindow
      for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 4; i++) { // calculate thirdpoints and put them in arrays
        var p1 = this.parent.data[vwindow.chr].dataPoints[i]
        var p2 = this.parent.data[vwindow.chr].dataPoints[i + 1]// reassign for easier coding
        var p3 = this.parent.data[vwindow.chr].dataPoints[i + 2]
        var p4 = this.parent.data[vwindow.chr].dataPoints[i + 3]
        var broken = false
        for (var j = i; j < i + 3; j++) {
          if (this.parent.data[vwindow.chr].dataPoints[j].end !== this.parent.data[vwindow.chr].dataPoints[j + 1].start) {
            broken = true// draw line down, might be drawn more than once
            this.drawDownLine(this.transformXCoordinate({
              chr: windowToDraw.chr, coor: (this.parent.data[vwindow.chr].dataPoints[j].start)
            }, false), this.transformYCoordinate(this.parent.data[vwindow.chr].dataPoints[j].data.value))
            this.drawDownLine(this.transformXCoordinate({
              chr: windowToDraw.chr, coor: (this.parent.data[vwindow.chr].dataPoints[j + 1].start)
            }, false), this.transformYCoordinate(this.parent.data[vwindow.chr].dataPoints[j + 1].data.value))
          }
        }
        if (broken) {
          continue
        }
        //    p1.t2 = [(p1.start + 1 / 3 * (p2.start - p1.start)), (p1.value + 1 / 3 * (p2.value - p1.value))]
        // draw lines between points, split lines into thirds
        p2.t1 = [(p1.start + 2 / 3 * (p2.start - p1.start)), (p1.data.value + 2 / 3 * (p2.data.value - p1.data.value))]
        p2.t2 = [(p2.start + 1 / 3 * (p3.start - p2.start)), (p2.data.value + 1 / 3 * (p3.data.value - p2.data.value))]
        p3.t1 = [(p2.start + 2 / 3 * (p3.start - p2.start)), (p2.data.value + 2 / 3 * (p3.data.value - p2.data.value))]
        p3.t2 = [(p3.start + 1 / 3 * (p4.start - p3.start)), (p3.data.value + 1 / 3 * (p4.data.value - p3.data.value))]
        //    p4.t1 = [(p3.start + 2 / 3 * (p4.start - p3.start)), (p4.value + 2 / 3 * (p4.value - p3.value))]
        p2.midPoint = [(p2.t1[0] + p2.t2[0]) / 2, (p2.t1[1] + p2.t2[1]) / 2]
        p3.midPoint = [(p3.t1[0] + p3.t2[0]) / 2, (p3.t1[1] + p3.t2[1]) / 2]
        var bPoints = [p2.midPoint, p2.t2, p3.t1, p3.midPoint]
        p2.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.midPoint[0]) }, false), this.transformYCoordinate(p2.midPoint[1])]
        p2.adjustedt2 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.t2[0]) }, false), this.transformYCoordinate(p2.t2[1])]
        p3.adjustedt1 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.t1[0]) }, false), this.transformYCoordinate(p3.t1[1])]
        p3.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.midPoint[0]) }, false), this.transformYCoordinate(p3.midPoint[1])]
        var adjustedBPoints = [p2.adjustedMidPoint, p2.adjustedt2, p3.adjustedt1, p3.adjustedMidPoint]
        this.drawBCurve(adjustedBPoints)
      }
      // this.transformXCoordinate({chr: windowToDraw.chr, coor: (start + end) / 2}, false)
      // drawSpline(points)
    }
    newBCurve () { // this one fills it too. note that some zooms have less than four points to workwith.
      var vwindow = this._mainSvg.viewWindow
      var svgToDraw = this._mainSvg
      var curveStart = 0
      var zeroCounter = 0 // if its is equal to 3 then consider new polygon
      var mode = parseInt(give.getParameterByName('mode') || '2')
      if (mode == 2) {
        for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 2; i++) {
          if (this.parent.data[vwindow.chr].dataPoints[i].end != this.parent.data[vwindow.chr].dataPoints[i + 1].start) {
            this.newDrawBCurve(curveStart, i + 1)
            curveStart = i + 1// will add in 0s to datapoints, need to break them if three in a row, also move to midpoinnt vs getStart
          }
        }
      }
      if (mode === 3) {
        for (var i = 0; i < this.parent.data[vwindow.chr].dataPoints.length - 2; i++) { // this is with 0's.
          if (this.parent.data[vwindow.chr].dataPoints[i].data.value == 0) {
            zeroCounter += 1
          }
          if (zeroCounter >= 3) {
            this.newDrawBCurve(curveStart, i + 1)
            curveStart = i + 1// will add in 0s to datapoints, need to break them if three in a row, also move to midpoinnt vs getStart
            zeroCounter = 0
          }
        }
      }
    }
    calculateSvgCurvePoints (i) {
      var vwindow = this._mainSvg.viewWindow
      var svgToDraw = this._mainSvg
      var windowToDraw = this._mainSvg.viewWindow
      var p1 = this.parent.data[vwindow.chr].dataPoints[i]
      var p2 = this.parent.data[vwindow.chr].dataPoints[i + 1]// reassign for easier coding
      var p3 = this.parent.data[vwindow.chr].dataPoints[i + 2]
      var p4 = this.parent.data[vwindow.chr].dataPoints[i + 3]

      //    p1.t2 = [(p1.start + 1 / 3 * (p2.start - p1.start)), (p1.value + 1 / 3 * (p2.value - p1.value))]
      // draw lines between points, split lines into thirds
      p2.t1 = [(p1.start + 2 / 3 * (p2.start - p1.start)), (p1.data.value + 2 / 3 * (p2.data.value - p1.data.value))]
      p2.t2 = [(p2.start + 1 / 3 * (p3.start - p2.start)), (p2.data.value + 1 / 3 * (p3.data.value - p2.data.value))]
      p3.t1 = [(p2.start + 2 / 3 * (p3.start - p2.start)), (p2.data.value + 2 / 3 * (p3.data.value - p2.data.value))]
      p3.t2 = [(p3.start + 1 / 3 * (p4.start - p3.start)), (p3.data.value + 1 / 3 * (p4.data.value - p3.data.value))]
      //    p4.t1 = [(p3.start + 2 / 3 * (p4.start - p3.start)), (p4.value + 2 / 3 * (p4.value - p3.value))]
      p2.midPoint = [(p2.t1[0] + p2.t2[0]) / 2, (p2.t1[1] + p2.t2[1]) / 2]
      p3.midPoint = [(p3.t1[0] + p3.t2[0]) / 2, (p3.t1[1] + p3.t2[1]) / 2]
      var bPoints = [p2.midPoint, p2.t2, p3.t1, p3.midPoint]
      p2.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.midPoint[0]) }, false), this.transformYCoordinate(p2.midPoint[1])]
      p2.adjustedt2 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p2.t2[0]) }, false), this.transformYCoordinate(p2.t2[1])]
      p3.adjustedt1 = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.t1[0]) }, false), this.transformYCoordinate(p3.t1[1])]
      p3.adjustedMidPoint = [this.transformXCoordinate({chr: windowToDraw.chr, coor: (p3.midPoint[0]) }, false), this.transformYCoordinate(p3.midPoint[1])]
      var adjustedBPoints = [p2.adjustedMidPoint, p2.adjustedt2, p3.adjustedt1, p3.adjustedMidPoint]
      return adjustedBPoints
    }
    newDrawBCurve (start, end) {
      var vwindow = this._mainSvg.viewWindow
      var svgToDraw = this._mainSvg
      var windowToDraw = this._mainSvg.viewWindow
      var BCurve = document.createElementNS(this.svgNS, 'path')
      var d = 'M'
      BCurve.setAttribute('stroke', 'black')
      BCurve.setAttribute('fill', 'blue')
      // BCurve.setAttribute("d","M")
      var SvgPoints = this.calculateSvgCurvePoints(start)
      // Start with 0
      d = d + SvgPoints[0][0] + ' ' + this.transformYCoordinate(0) + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + SvgPoints[3][1]
      for (var i = start + 1; i < end - 3; i++) { // sytnax: M10 10 C 10 10 10 10 10 10 C 10 10 10 10 10 10 ...
        SvgPoints = this.calculateSvgCurvePoints(i)
        d = d + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + SvgPoints[3][1]
      }
      SvgPoints = this.calculateSvgCurvePoints(end - 3)
      // end with 0
      d = d + ' C ' + SvgPoints[1][0] + ' ' + SvgPoints[1][1] + ' ' + SvgPoints[2][0] + ' ' + SvgPoints[2][1] + ' ' + SvgPoints[3][0] + ' ' + this.transformYCoordinate(0)
      BCurve.setAttribute('d', d)
      this.addElement(BCurve, svgToDraw)
    }

    /**
     * anonymous function - Takes a specified amount of points (by slidingWindowHalfWidth) around the point and assigns the average y value of all those points to the middle point's display.
     * An even amount of points will mean taking an extra point to the left in the average.
     *
     * @return {type}  description
     */
    averagePoints () {
      var splitAmount = Math.ceil((this.slidingWindowHalfWidth - 1) / 2)
      var vwindow = this._mainSvg.viewWindow
      this.parent.data[vwindow.chr].averageDataPoints = []
      for (var i = splitAmount; i < this.parent.data[vwindow.chr].dataPoints.length - splitAmount - 1; i++) {
        var temp = this.parent.data[vwindow.chr].dataPoints[i]
        var sum = 0
        for (var j = 0; j < this.slidingWindowHalfWidth; j++) {
          sum += this.parent.data[vwindow.chr].dataPoints[i - splitAmount + j].data.value
        }
        temp.data.value = parseInt(sum / this.slidingWindowHalfWidth + 0.5)
        this.parent.data[vwindow.chr].averageDataPoints.push(temp)
      }
    }

    _pushCoorToPolygon (polygon, vwindow, xCoor, yValue, flags, replace) {
      if (!replace) {
        polygon.points.push(this.transformXCoordinate({
          chr: vwindow.chr,
          coor: xCoor
        }, false) + ',' + this.transformYCoordinate(yValue, flags))
      } else {
        polygon.points[0] = this.transformXCoordinate({
          chr: vwindow.chr,
          coor: xCoor
        }, false) + ',' + this.transformYCoordinate(yValue, flags)
      }
      polygon.lastX = xCoor
    }

    _endPolygon (polygon) {
      var svgToDraw = this._mainSvg
      this.createRawPolygon(polygon.points, {
        class: 'wiggleShapes',
        fill: this.constructor.colorSet[this.forecolorIndex],
        stroke: this.constructor.colorSet[this.forecolorIndex]
      }, svgToDraw)
      this.drawOverflowLines(polygon.overflows)
      polygon.points = []
      polygon.overflows = {exceedMax: [], exceedMin: []}
    }

    /**
     * drawPeak - Draws the given points onto the svg window.
     *
     * @param  {type} currPolygon description
     * @param  {type} dataEntry   description
     * @return {type}             description
     */
    drawPeak (dataPoints) {
      let svgToDraw = this._mainSvg
      let windowToDraw = svgToDraw.viewWindow

      let currPolygon = { points: [], overflows: {exceedMax: [], exceedMin: []} }

      for (let i = 0; i < dataPoints.length; i++) {
        let start = dataPoints[i].start
        let end = dataPoints[i].end
        let yValue = dataPoints[i].data.value

        // first decide whether only one point will be pushed
        let middlePointOnly = (this.transformXCoordinate({chr: windowToDraw.chr, coor: end}) -
          this.transformXCoordinate({chr: windowToDraw.chr, coor: start}) < 1)

        if (yValue !== 0) {
          // this point (two points) should be pushed to currPolygon
          if (currPolygon.points.length === 0) {
            // no point yet, push a zero first
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (middlePointOnly ? (start + end) / 2 : start), 0)
          }
          let flags = {}
          if (middlePointOnly) {
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (start + end) / 2, yValue, flags)
          } else {
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              start, yValue, flags)
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              end, yValue, flags)
          }
          // process overflows
          if (flags.EXCEED_MIN) {
            let lastExceed = currPolygon.overflows.exceedMin[currPolygon.overflows.exceedMin.length - 1]
            if (!lastExceed || !lastExceed.concat(dataPoints[i])) {
              currPolygon.overflows.exceedMin.push(dataPoints[i].clone())
            }
          } else if (flags.EXCEED_MAX) {
            let lastExceed = currPolygon.overflows.exceedMax[currPolygon.overflows.exceedMax.length - 1]
            if (!lastExceed || !lastExceed.concat(dataPoints[i])) {
              currPolygon.overflows.exceedMax.push(dataPoints[i].clone())
            }
          }
        } else { // yValue === 0
          if (currPolygon.points.length > 1) {
            // there is an old polygon, finish this first
            this._pushCoorToPolygon(currPolygon, windowToDraw,
              (middlePointOnly ? (start + end) / 2 : start), 0)
            this._endPolygon(currPolygon)
          }
          // then put the zero in currPolygon
          // (replace the previous one if exists)
          this._pushCoorToPolygon(currPolygon, windowToDraw,
            (middlePointOnly ? (start + end) / 2 : end), 0, null, true)
        }
      } // end iterating dataPoints

      if (currPolygon.points.length > 1) {
        this._pushCoorToPolygon(currPolygon, windowToDraw,
          currPolygon.lastX, 0)
        this._endPolygon(currPolygon)
      }
    }

    _drawPeakFromBedGraph (currPolygon, dataEntry) {
      let svgToDraw = this._mainSvg
      let windowToDraw = svgToDraw.viewWindow
      let flags = {}

      currPolygon = currPolygon || {}
      if (!currPolygon.hasOwnProperty('points')) {
        currPolygon.points = []
      }

      let start = dataEntry ? Math.max(dataEntry.start, windowToDraw.start) : windowToDraw.end + 1
      let end = dataEntry ? Math.min(dataEntry.end, windowToDraw.end) : windowToDraw.end + 2
      if (start < end) {
        if (currPolygon.points.length > 0) {
        // old polygon is there
          if (currPolygon.lastX < start) {
          // it's a separate polygon
            currPolygon.points.push(
              this.transformXCoordinate({chr: windowToDraw.chr, coor: currPolygon.lastX}, false) +
            ',' + this.transformYCoordinate(0))
            this.createRawPolygon(currPolygon.points, {class: 'wiggleShapes',
              fill: this.constructor.rgbToHex(this.constructor.colorSet[0]),
              stroke: this.constructor.rgbToHex(this.constructor.colorSet[0])
            }, svgToDraw)
            this.drawOverflowLines(currPolygon.overflows)
            currPolygon.points = []
          }
        }
        if (dataEntry && dataEntry.chr === windowToDraw.chr) {
          let yvalue = dataEntry.data instanceof give.TrackObjectImpl._BigWigImpl._SummaryCtor
            ? dataEntry.data.sumData / dataEntry.length : dataEntry.data.value
          if (currPolygon.points.length <= 0) {
          // start a new polygon, push the (x, 0) point of this segment
            currPolygon.points.push(
              this.transformXCoordinate({chr: windowToDraw.chr, coor: start}, false) +
            ',' + this.transformYCoordinate(0))
            currPolygon.overflows = {exceedMax: [], exceedMin: []}
          }
          // then push the top two points
          if (/* this.transformXCoordinate({chr: windowToDraw.chr, coor: end}) -
            this.transformXCoordinate({chr: windowToDraw.chr, coor: start}) < 1 */true) {
            // both are within one pixel
            currPolygon.points.push(
              this.transformXCoordinate({chr: windowToDraw.chr, coor: (start + end) / 2}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
          } else {
            currPolygon.points.push(
              this.transformXCoordinate({chr: windowToDraw.chr, coor: start}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
            currPolygon.points.push(
              this.transformXCoordinate({chr: windowToDraw.chr, coor: end}, false) +
            ',' + this.transformYCoordinate(yvalue, flags))
          }
          currPolygon.lastX = end
        }
      }
      // process overflows
      if (flags.EXCEED_MIN) {
        let lastExceed = currPolygon.overflows.exceedMin[currPolygon.overflows.exceedMin.length - 1]
        if (!lastExceed || !lastExceed.concat(dataEntry)) {
          currPolygon.overflows.exceedMin.push(dataEntry.clone())
        }
      } else if (flags.EXCEED_MAX) {
        let lastExceed = currPolygon.overflows.exceedMax[currPolygon.overflows.exceedMax.length - 1]
        if (!lastExceed || !lastExceed.concat(dataEntry)) {
          currPolygon.overflows.exceedMax.push(dataEntry.clone())
        }
      }

      return true
    }

    /**
     * drawScale - Draws the signal strength scale on the left side of the
     *  track.
     */
    drawScale () {
      if (this._textSvg) {
        // first draw the lines
        this.drawLine(
          this.textMargin - this.margin, this.drawingBoundary.top,
          this.textMargin - this.margin, this.drawingBoundary.bottom,
          this.textColorIndex, this._textSvg)
        this.drawLine(this.textMargin - this.margin - this.scaleTickLength,
          this.drawingBoundary.top,
          this.textMargin - this.margin, this.drawingBoundary.top,
          this.textColorIndex, this._textSvg)
        this.drawLine(this.textMargin - this.margin - this.scaleTickLength,
          this.drawingBoundary.bottom,
          this.textMargin - this.margin, this.drawingBoundary.bottom,
          this.textColorIndex, this._textSvg)
        // then the text
        this.drawText(this.textMargin - this.margin -
          this.scaleTickLength - this.textRightPadding,
        this.drawingBoundary.top + this.textSize * 0.4,
        give._maxDecimalDigits(this.windowMax,
          this.numOfDigits).toString(),
        'end', null, this._textSvg)
        this.drawText(this.textMargin - this.margin -
          this.scaleTickLength - this.textRightPadding,
        this.drawingBoundary.bottom - this.textSize * 0.4,
        give._maxDecimalDigits(this.windowMin,
          this.numOfDigits).toString(),
        'end', null, this._textSvg)
      }
    }

    /**
     * anonymous function - Sets the window range.
     *
     * @param  {type} min description
     * @param  {type} max description
     * @return {type}     description
     */
    setExtremes (min, max) {
      if (max > min) {
        this.windowMin = min
        this.windowMax = max
        this.autoScale = false
      } else {} // there is an error
    }

    /**
     * anonymous function - Automatically scales the window, taking the maximum and minimum signal strengths in the display window as the range extremes.
     *
     * @return {type}  description
     */
    autoWindow () {
      this.autoScale = true
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {
        margin: 2,
        textColorIndex: 0, // the color index for text
        overflowColorIndex: 8, // the color index for overflow (red)
        overflowStrokeWidth: 4,
        scaleTextSize: 9,
        minResolutionPerPixel: 1,
        windowMax: 20,
        windowMin: 0,
        autoScale: true,
        includeZero: true,
        upperProportion: 0.1,
        lowerProportion: 0.1,
        numOfDigits: 2,
        scaleTickLength: 5,
        slidingWindowHalfWidth: 5,
        forecolorIndex: 1
      })
    }
  }

  BigWigTrackDom._DEFAULT_HEIGHT = 80

  give.BigWigTrackDom = BigWigTrackDom

  return give
})(GIVe || {})
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
   * A track for bigWig data (continuous analog signal across the genome),
   * see `GIVe.TrackObject` for details.
   * @typedef {object} BigWigTrack
   * @class give.BigWigTrack
   * @implements give.TrackObject
   */
  class BigWigTrack extends give.TrackObject {
    /**
     * typeList - get the key strings showing this type of data.
     *    This shall be the same as the `type` column for track entries in
     *    `trackDb` table so that GIVE is able to figure out the track is of
     *    this type.
     * @static
     * @property
     *
     * @returns {Array<string>}  return all keys matching this type.
     */
    static get typeList () {
      return ['bigwig']
    }
  }

  // specify the data object (if needed) used in this track
  BigWigTrack._DataObjCtor = give.BigWigTrackData

  // specify the visualization object used in this track
  BigWigTrack._DomObjCtor = give.BigWigTrackDom

  // __IMPORTANT:__ register this new track type
  give.TrackObject.registerTrack(BigWigTrack)

  give.BigWigTrack = BigWigTrack

  return give
})(GIVe || {})
