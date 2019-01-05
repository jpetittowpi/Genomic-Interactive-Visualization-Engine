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
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import '../track-object.js';

import '../../chrom-region/chrom-region.js';
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
   * Object representing a BED track data object,
   * see `GIVe.TrackDataObject` for details.
   * @typedef {object} InteractionTrackData
   * @class give.InteractionTrackData
   *
   * @constructor
   * @param {TrackObjectBase} parent - The track object parent
   */
  class InteractionTrackData extends give.TrackDataObject {
    /**
     * _dataHandler - This should be the detailed implementation about how to
     *    handle the responses from server
     *
     *    When implementing this method, use `this.getData` to get the `GiveTree`
     *    object storing all necessary data corresponding to the correct
     *    chromosome. Then use `.insert` to insert the new data entries.
     *
     *    See documentation for `TrackDataObject` for references to
     *    `this.getData`, and `GIVe.GiveTree` for references to `.insert`.
     *
     * @memberof TrackDataObjectBase.prototype
     * @param  {object} response - Responses from remote servers.
     *   The object should contain chromosomal region strings as its
     *   property names, and an array of data entries as the property value.
     *   For example:
     *   ```
     *   {
     *     'chr10:1-1000000': [
     *       <response entry>,
     *       ...
     *     ]
     *   }
     *   ```
     *   See `this._chromEntryFromResponse` for details of `<response entry>`.
     * @param  {Array<ChromRegionLiteral>} queryRegions - Query regions,
     *   including potential resolutions
     */
    _dataHandler (res, regions) {
      // notice that dirFlag can be undefined,
      //    however, if it's defined, then it will be the window index (for now)
      let resToRegion = resEntry => new give.ChromRegion(
        resEntry.regionString,
        this.parent.refObj, {
          data: {
            linkID: parseInt(resEntry.linkID),
            regionID: parseInt(resEntry.ID),
            value: parseFloat(resEntry.value),
            dirFlag: isNaN(parseInt(resEntry.dirFlag))
              ? null : parseInt(resEntry.dirFlag)
          }
        }
      )

      for (var chrom in res) {
        if (res.hasOwnProperty(chrom) && Array.isArray(res[chrom])) {
          this.getData(chrom, true).insert(res[chrom].map(resToRegion),
            regions)
        }
      }
    }

    _fileHandler (res, regions) {
      // placeholder to read local file content
      // query is the current window (may involve buffering, can be implemented in prepareCustomQuery)
      // data will be passed via firing a 'response' event with {detail: data}
      // and the response will be handled by this.responseHandler(e, detail)

      // Interaction file implementation:
      //    brutal force going through the file to find regions that intersect the query region
      //    return the lines filtered
      //    currently using FileReader.readAsText(), may change into better adaptations for bigger files
      //      like in http://matthewmeye.rs/blog/post/html5-line-reader/
      //      or    http://stackoverflow.com/questions/24647563/reading-line-by-line-file-in-javascript-on-client-side

      let lines = res.split(/\r\n|\r|\n/g)
      let linkID = 0
      let result = {}
      lines.forEach(line => {
        linkID++
        let tokens = line.split(/\s+/g)
        let regionPair = [
          new give.ChromRegion(tokens[0] + ':' + tokens[1] + '-' + tokens[2] +
            '(' + tokens[3] + ')'),
          new give.ChromRegion(tokens[4] + ':' + tokens[5] + '-' + tokens[6] +
            '(' + tokens[7] + ')')
        ]
        if (regionPair.some(function (regionEnd, index) {
          return regionEnd.overlaps(regions[index])
        }, this)) {
          // needs to push this line to result
          regionPair.forEach(function (region, index) {
            if (!result.hasOwnProperty(region.chr)) {
              result[region.chr] = []
            }
            result[region.chr].push({
              regionString: region.toString(),
              linkID: linkID,
              dirFlag: index
            })
          }, this)
        }
      })
      return this._dataHandler(result, regions)
    }
  }

  give.InteractionTrackData = InteractionTrackData

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
 *
 */
var GIVe = (function (give) {
  'use strict'

  class InteractionTrackDom extends give.TrackDom {
    constructor (track, properties) {
      super(...arguments)
      this.gradient = [{ percent: 0, color: 0x3F51B5 },
        { percent: 0.33, color: 0x4CAF50 },
        { percent: 0.67, color: 0xCDDC39 },
        { percent: 1, color: 0xF44336 }] // Gradient (indigo-green-lime-red)
    }
    _initProperties (properties) {
      super._initProperties(properties)

      this.maxFillOpacity = this._initPropertyItem(
        'maxFillOpacity', properties, 'maxFillOpacity', 'float')

      this.subTrackGap = this._initPropertyItem(
        'subTrackGap', properties, 'subTrackGap', 'float')

      this.threshold = this._initPropertyItem(
        'threshold', properties, 'threshold', 'float')

      this.borderHeight = this._initPropertyItem(
        'borderHeight', properties, 'borderHeight', 'float')

      this.borderColorIndex = this._initPropertyItem(
        'borderColorIndex', properties, 'borderColorIndex', 'float')

      this.bandBorder = this._initPropertyItem(
        'bandBorder', properties, 'bandBorder', 'float')

      this.quantiles = this.getTrackSetting('quantiles') ||
        this.getTrackSetting('thresholdPercentile')

      this._subSvgs = []
    }

    get DEFAULT_HEIGHT () {
      return (this.fullHeightRatio + (this.fullHeightRatio + this.subTrackGap) *
        (this.parent.windowSpan - 1)) * this.textSize
    }

    get viewWindow () {
      return this._subSvgs.map(subSvg => subSvg.viewWindow)
    }

    set viewWindow (newViewWindows) {
      if (!Array.isArray(newViewWindows)) {
        throw new give.GiveError('newViewWindows for interaction not an array!')
      }
      this._subSvgs.forEach((subSvg, index) => {
        subSvg.viewWindow = newViewWindows[index]
      })
    }

    _getSubSvgId (index) {
      return this.parent.cleanId + '_subSvg' + index
    }

    _initSvgComponents () {
      for (var i = 0; i < this.parent.windowSpan; i++) {
        var newSubSvg = document.createElementNS(this.svgNS, 'svg')
        newSubSvg.setAttribute('id', this._getSubSvgId(i))
        this._mainSvg.holder.appendChild(newSubSvg)
        this._subSvgs.push(newSubSvg)
      }
      this._subSvgs.forEach(subSvg => this._initSvgHolder(subSvg))
    }

    _setSvgComponentsSize () {
      this._subSvgs.forEach((subSvg, index) => {
        subSvg.setAttributeNS(null, 'x', 0)
        subSvg.setAttributeNS(null, 'y',
          (this.fullHeightRatio + this.subTrackGap) * index * this.textSize)
        subSvg.setAttributeNS(null, 'width', this.windowWidth)

        subSvg.setAttributeNS(null, 'height',
          this.fullHeightRatio * this.textSize)
        subSvg.setAttribute('viewBox', '0 0 ' +
          this.windowWidth + ' ' + this.fullHeightRatio * this.textSize)
      })
    }

    // ****** customized methods below ******

    drawData () {
      // this is to draw everything from this.data to the svg
      // Steps:
      //     put genes into lines (pack display)
      //    draw genes out line by line

      // clear text Margin svg
      this.clear()

      this._linkMap = {}
      // draw box track for each child svg
      this._subSvgs.forEach((subSvg, index) => {
        this.drawBoxTrack(this.parent.getData(subSvg.viewWindow.chr),
          this._linkMap, 0.5, this.textSize * this.fullHeightRatio - 1,
          subSvg, index)
      })

      // draw interaction track for main svg
      this.drawConnectionBetweenTracks(this._linkMap, this._subSvgs,
        this.svgMain)
    }

    clear () {
      super.clear()
      this._subSvgs.forEach(subSvg => {
        this.clearSvg(subSvg)
        this._mainSvg.holder.appendChild(subSvg)
      })
    }

    updateThreshold (threshold) {
      this.threshold = (typeof (threshold) !== 'undefined' && threshold !== null ? threshold : this.threshold)
      this.checkDataAndUpdateDebounced()
    }

    drawBoxTrack (regions, linkMap, y, height, svgToDraw, index) {
      // regions is a chromBPTree of all connections
      // regions with the same ID is connected and needs to be colored accordingly
      // linkMap is an object with regionID as key and value as following:
      //     color: the color index of the link;
      //    regions: the regions with the same ID (array);

      // may need to filter the regions first, either here or outside

      let colorIndex = 0
      svgToDraw = svgToDraw || this._mainSvg
      height = height || this.borderHeight * this.textSize
      y = y || 0

      let windowToDraw = svgToDraw.viewWindow
      let traverseFunc = region => {
        let linkID = region.data.linkID
        if (!linkMap.hasOwnProperty(linkID)) {
        // color is already there
          colorIndex++
          if (colorIndex >= this.constructor.colorSet.length) {
            colorIndex = 0
          }
          linkMap[linkID] = []
          linkMap[linkID].color = colorIndex
          linkMap[linkID].map = {}
        }
        if (!linkMap[linkID].map.hasOwnProperty(region.data.regionID)) {
          linkMap[linkID].push(region)
          linkMap[linkID].map[region.data.regionID] = region
        }
      }
      let filterFunc = region => {
        if (!this.isAboveThreshold(region.data.value) ||
          (typeof (region.data.dirFlag) === 'number' &&
            region.data.dirFlag !== index
          )
        ) {
          return false
        }
        return true
      }

      if (regions && regions instanceof give.GiveTree) {
        regions.traverse(windowToDraw, traverseFunc, filterFunc, false)
      }

      // then draw the two horizontal lines
      if (!this.parent.refObj.chromInfo[windowToDraw.chr].cent ||
        !this.regionInWindow(
          this.parent.refObj.chromInfo[windowToDraw.chr].cent, svgToDraw)
      ) {
        // no centromere, just draw two lines
        this.drawLine(0, y, this.windowWidth, y, this.borderColorIndex, svgToDraw)
        this.drawLine(0, y + height, this.windowWidth, y + height,
          this.borderColorIndex, svgToDraw)
      } else {
        // has centromere, draw p part first
        let pX = this.transformXCoordinate(
          this.parent.refObj.chromInfo[windowToDraw.chr].cent.startCoor,
          false, svgToDraw)
        if (pX > 0 && pX < this.windowWidth) {
          this.drawLine(0, y, pX, y, this.borderColorIndex, svgToDraw)
          this.drawLine(0, y + height, pX, y + height, this.borderColorIndex,
            svgToDraw)
        }
        // then centromere
        let qX = this.transformXCoordinate(
          this.parent.refObj.chromInfo[windowToDraw.chr].cent.endCoor, false,
          svgToDraw)
        this.drawLine(pX, y + height, qX, y, this.borderColorIndex, svgToDraw)
        this.drawLine(pX, y, qX, y + height, this.borderColorIndex, svgToDraw)
        // then q part
        if (qX > 0 && qX < this.windowWidth) {
          this.drawLine(qX, y, this.windowWidth, y, this.borderColorIndex,
            svgToDraw)
          this.drawLine(qX, y + height, this.windowWidth, y + height,
            this.borderColorIndex, svgToDraw)
        }
      }
    }

    /**
     * _generatePerm - generate permutation for neighboring svgs
     *
     * @param  {number} length - length of the interaction array
     * @returns {Array<number>} permutation index values.
     *    The return value will be all possible index permutations that is
     *    available to the neighboring two svgs.
     *    For example, for a `length` of 3, the return value will become:
     *    `[[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]]`
     *    For every sub-array, it's the indices of the interactions that
     *    neighboring svgs (two of them) will pull out from `linkMap`.
     */
    _generatePerm (length) {
      if (length === 2) {
        return [[0, 1], [1, 0]]
      } else {
        // console.log(length);
      }
    }

    _drawConnectionBetweenNeighboringTracks (linkMap, svgNeighbors, svgMain) {
      // linkMap is an object with regionID as key and regions as value (array)
      // the colorMap should have been already populated
      // windowsToDraw should be 'viewWindow' property of svgChildren

      let regionMap = {}

      for (let regionID in linkMap) {
        if (linkMap.hasOwnProperty(regionID)) {
          // region is here, draw the link (polygon)

          // if(linkMap[regionID][0].data.value < threshold)
          // now quantile is used instead of raw # of reads
          let linkItem = linkMap[regionID]
          if (!this.isAboveThreshold(linkItem[0].data.value)) {
            continue
          }

          let perm = this._generatePerm(linkItem.length)
          if (!perm) {
            continue
          }

          perm.forEach(function (permIndex, index) {
            if (
              permIndex.some((currentPerm, svgIndex) => this.regionInWindow(
                linkItem[currentPerm], svgNeighbors[svgIndex]
              )) &&
              permIndex.every((currentPerm, svgIndex) => (
                (typeof (linkItem[currentPerm].data.dirFlag) !== 'number' ||
                  linkItem[currentPerm].data.dirFlag === svgIndex
                ) &&
                linkItem[currentPerm].chr ===
                  svgNeighbors[svgIndex].viewWindow.chr
              ))
            ) {
              // prepare the points
              let startPoints = []
              let endPoints = []

              let partialOutside = false

              svgNeighbors.forEach((svgChild, svgIndex) => {
                let x = this.transformXCoordinate(
                  linkItem[permIndex[svgIndex]].startCoor, true, svgChild)
                if (x > this.windowWidth) {
                  partialOutside = true
                }

                let y = (parseInt(svgChild.getAttributeNS(null, 'y')) || 0)

                startPoints.push((x - this.bandBorder / 2) + ',' + y)
                startPoints.push(
                  (x - this.bandBorder / 2) + ',' +
                  (y + svgChild.height.animVal.value)
                )

                x = this.transformXCoordinate(
                  linkItem[permIndex[svgIndex]].endCoor, true, svgChild)
                if (x < 0) {
                  partialOutside = true
                }

                x += (parseInt(svgChild.getAttributeNS(null, 'x')) || 0)
                endPoints.push((x + this.bandBorder / 2) + ',' + y)
                endPoints.push(
                  (x + this.bandBorder / 2) + ',' +
                  (y + svgChild.height.animVal.value)
                )
              })

              let points = startPoints.concat(endPoints.reverse())
              if (!regionMap.hasOwnProperty(points)) {
                if (this.quantiles) {
                  this.createRawPolygon(points, {id: regionID,
                    class: 'linkedRegion',
                    fill: this.constructor.rgbToHex(this.percentileToGradient(
                      this.valueToPercentile(linkItem[0].data.value))),
                    stroke: this.constructor.rgbToHex(this.constructor.colorSet[linkItem.color]),
                    'stroke-width': 2,
                    'fill-opacity':
                      this.valueToPercentile(linkItem[0].data.value) *
                      this.maxFillOpacity
                  }, svgMain)
                } else {
                  this.createRawPolygon(points, {id: regionID,
                    class:
                      'linkedRegion ' +
                      (partialOutside ? 'partialOutside' : 'fullyInside'),
                    fill: this.constructor.rgbToHex(this.constructor.colorSet[0]),
                    stroke: this.constructor.rgbToHex(this.constructor.colorSet[0])
                    // 'stroke-width': 0.5,
                    // 'fill-opacity': partialOutside? 0.01: 0.2,
                    // 'stroke-opacity': 1,
                  }, svgMain)
                }
                regionMap[points] = true
              }
            }
          }, this)
        }
      }
    }

    drawConnectionBetweenTracks (linkMap, svgChildren, svgMain) {
      svgMain = svgMain || this._mainSvg
      svgChildren = svgChildren || this._subSvgs
      for (var i = 1; i < svgChildren.length; i++) {
        this._drawConnectionBetweenNeighboringTracks(linkMap,
          [svgChildren[i - 1], svgChildren[i]], svgMain)
      }
    }

    isAboveThreshold (value, threshold) {
      threshold = threshold || this.threshold
      if (typeof (value) === 'number') {
        if (this.quantiles) {
          return this.valueToPercentile(value) >= threshold / 100
        } else {
          return value >= threshold
        }
      } else {
        return true
      }
    }

    valueToPercentile (value, considerThreshold) {
      if (Array.isArray(this.quantiles) && this.quantiles.length > 0) {
        var result = 0
        this.quantiles.every(function (quantile, index) {
          result = index
          return quantile < value
        })
        result = result / (this.quantiles.length - 1)
        return considerThreshold
          ? (this.threshold < 100
            ? (result - this.threshold / 100) / (1 - this.threshold / 100)
            : 0.5)
          : result
      }
      // otherwise, throw exception
      throw (new give.GiveError('Quantile data missing!'))
    }

    percentileToGradient (percentile) {
      // return the gradient value from this.gradient
      // first find the closest two colors
      var leftColor, rightColor, colorIndex
      this.gradient.every(function (colorSet, index) {
        colorIndex = index
        return colorSet.percent < percentile
      })
      if (colorIndex === 0) {
        return this.gradient[0].color
      }
      leftColor = this.gradient[colorIndex - 1]
      rightColor = this.gradient[colorIndex]
      return this.getColorBetween(leftColor.color, rightColor.color,
        (percentile - leftColor.percent) /
        (rightColor.percent - leftColor.percent)
      )
    }

    getColorBetween (lColor, rColor, weight) {
      return (parseInt((rColor & 0xFF0000) * weight +
        (lColor & 0xFF0000) * (1 - weight)) & 0xFF0000
      ) + (parseInt((rColor & 0x00FF00) * weight +
        (lColor & 0x00FF00) * (1 - weight)) & 0x00FF00
      ) + (parseInt((rColor & 0x0000FF) * weight +
        (lColor & 0x0000FF) * (1 - weight)) & 0x0000FF)
    }

    static get defaultProperties () {
      return Object.assign(super.defaultProperties || {}, {
        maxFillOpacity: 0.3,
        subTrackGap: 6,
        threshold: 0.1,
        borderHeight: 1,
        borderColorIndex: 0,
        bandBorder: 1.0
      })
    }
  }

  give.InteractionTrackDom = InteractionTrackDom

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
   * Object representing a BED track, see `GIVe.TrackObject` for details.
   * @typedef {object} InteractionTrack
   * @class give.InteractionTrack
   * @implements give.TrackObject
   */
  class InteractionTrack extends give.TrackObject {
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
      return ['interaction']
    }

    /**
     * _getWindowSpan - Get the number of windows for the track to span across
     * @static
     *
     * @return {number} number of windows this track will span across
     */
    static _getWindowSpan () {
      return this.INTERACTION_WINDOW_SPAN
    }
  }

  InteractionTrack._DataObjCtor = give.InteractionTrackData

  InteractionTrack._DomObjCtor = give.InteractionTrackDom

  InteractionTrack.INTERACTION_WINDOW_SPAN = 2

  give.TrackObject.registerTrack(InteractionTrack)

  give.InteractionTrack = InteractionTrack

  return give
})(GIVe || {})
