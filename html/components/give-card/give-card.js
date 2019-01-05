/* GeNemo Card element
  A wrapper for title and contents.
  Contents should implement GenemoTabCardContentBehavior,
  and can be folded unless disable-folding is set on the card.

  When the local DOM initialization is done, domReady flag will be set.
  When content-dom-ready event occurs and local DOM has been completed,
  populateDOM() will be called to populate local DOM, then content-dom-ready
  will be bubbled to parent elements

*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '../../../../@polymer/polymer/polymer-element.js';

import { beforeNextRender } from '../../../../@polymer/polymer/lib/utils/render-status.js';
import '../../../../@polymer/paper-icon-button/paper-icon-button.js';
import '../../../../@polymer/iron-icons/iron-icons.js';
import { IronResizableBehavior } from '../../../../@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout.js';
import '../../../../@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../../../../@polymer/paper-material/paper-material.js';
import '../../../../@polymer/paper-spinner/paper-spinner.js';
import '../../../../@polymer/neon-animation/web-animations.js';
import '../give-styles.js';
import '../../../../@webcomponents/shadycss/entrypoints/apply-shim.js';
import { mixinBehaviors } from '../../../../@polymer/polymer/lib/legacy/class.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="give-card">
  <template>
    <style include="give-shared-styles iron-flex iron-positioning iron-flex-alignment">
    :host {
      display: inline-block;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      z-index: 0;
      margin: 0.25em 0;
      text-align: left;
      position: relative;
      @apply --layout-vertical;
      @apply --give-card-mixin;
    }

    /************************** Polymer and Material Design components below *********************/

    /************************** Polymer and Material Design size and others below *********************/
    #hiddenCardHeaderHolder {
      display: none;
    }
    paper-material {
      background: var(--card-background-color);
      @apply --give-card-material-mixin;
    }

    #cardContent.collapsed {
      display: none;
    }

    .cardHeader {
      background: var(--card-header-background-color);
      margin: 0;
    }

    .cardHeader paper-icon-button {
      width: 2.5em;
      height: 2.5em;
      padding: 0.5em;
    }

    div.cardHeader div.headerText {
      font-weight: 700;
      font-size: 1.15em;
      margin: 0 0.5em 0 0.1em;
      overflow-x: hidden;
      min-height: 2em;
      @apply --layout-horizontal;
      @apply --layout-center;
    }

    div.cardHeader.expanded {
      min-height: 2.5em;
      flex: 0 0 2.5em;
    }

    div.headerText > *::first-letter {
      text-transform: capitalize;
    }

    .collapseContentLine > .anno {
      color: var(--default-primary-color);
      margin-right: 0.2em;
      text-transform: capitalize;
    }

    .collapseContentLine > .content {
      @apply --layout-flex;
    }

    .collapseContentLine {
      font-size: var(--base-font-size, var(--default-font-size));
      @apply --layout-horizontal;
      @apply --layout-start;
    }

    .collapseContent {
      background: var(--card-background-color);
      padding: 0.3em 0.5em;
      word-break: break-all;
      @apply --layout-vertical;
    }
  </style>
    <paper-material elevation="1" class="layout vertical flex">
      <template is="dom-if" if="[[!_readiness]]">
        <div id="loadingBlock">
          <paper-spinner id="loadingSpinner" alt="Loading card content" active\$="[[!_readiness]]">
          </paper-spinner>
        </div>
      </template>
      <div id="cardHeader" class="cardHeader expanded layout horizontal center">
        <template is="dom-if" if="[[!disableFolding]]" restamp="true">
          <paper-icon-button icon="[[expandIcon]]" class="self-start" id="expandButton" on-click="toggleCollapse">
          </paper-icon-button>
        </template>
        <template is="dom-if" if="[[_showOriginalHeader]]">
          <div id="cardHeaderContainer" class="flex layout horizontal"></div>
        </template>
        <div id="hiddenCardHeaderHolder">
          <slot id="cardHeaderSlot" name="header"></slot>
        </div>
      </div>
      <div id="cardContent" class="layout vertical">
        <slot id="cardBodySlot" name="body"></slot>
      </div>
    </paper-material>
  </template>
  
</dom-module>`;

document.head.appendChild($_documentContainer.content);
var GIVe = (function (give) {
  'use strict'

  class GiveCard extends mixinBehaviors([
    IronResizableBehavior
  ], PolymerElement) {
    static get is () {
      return 'give-card'
    }

    static get properties () {
      return {
        isOpened: {
          type: Boolean,
          value: true,
          observer: '_isOpenedChanged'
        },

        expandIcon: {
          type: String,
          value: 'expand-more'
        },

        domReady: { // flag indicating whether local DOM is ready
          type: Boolean,
          value: false,
          readOnly: true
        },

        disableFolding: {
          type: Boolean,
          value: false
        },

        _readiness: {
          type: Boolean,
          value: false
        },

        _showOriginalHeader: {
          type: Boolean,
          value: true
        }
      }
    }

    ready () {
      super.ready()
      this._collapsedHeaderElement = null
      this._boundContentReadyHandler = this._contentReadyHandler.bind(this)
      this._boundSlotChangeHandler = this._slotChangeHandler.bind(this)
      this.$.cardBodySlot.addEventListener(
        'slotchange', this._boundSlotChangeHandler
      )
      this.$.cardHeaderSlot.addEventListener(
        'slotchange', this._boundSlotChangeHandler
      )
      this.addEventListener(
        'content-ready', this._boundContentReadyHandler
      )
      this.addEventListener(
        'update-height', this._updateHeight
      )
    }

    connectedCallback () {
      super.connectedCallback()
      beforeNextRender(this, () => {
        this.populateDOM()
        this._setContentReady(true)
      })
    }

    _slotChangeHandler (event) {
      this.populateDOM()
      this._setContentReady(true)
    }

    _toggleCollapseHeader (flag) {
      // the top node with cardBodySlot should have a property named
      //    .collapsedElement
      // then use this property to replace _collapsedHeaderElement
      // if nothing, then _collapsedHeaderElement is simply GenemoHead
      // flag is the target status

      if (flag && this._collapsedHeaderElement) {
        // there is old collapseHeader, needs to be removed
        this.$.cardHeader.classList.add('expanded')
        this.$.cardHeader.removeChild(this._collapsedHeaderElement)
      } else if (!flag) {
        this.$.cardHeader.classList.remove('expanded')
        let contentNode = this.$.cardBodySlot.assignedNodes({ flatten: true })
        if (contentNode) {
          contentNode = contentNode[0]
          this._collapsedHeaderElement = contentNode.collapsedElement
          if (this._collapsedHeaderElement) {
            this._collapsedHeaderElement.classList.add(
              'flex', 'layout', 'vertical')
            this.$.cardHeader.appendChild(this._collapsedHeaderElement)
          }
        }
      }
      this._showOriginalHeader = flag || !this._collapsedHeaderElement
    }

    _isOpenedChanged (newValue, oldValue) {
      if (newValue) {
        // expand card panel, send signal to parent
        // (so that parent may collapse the siblings of `this`)
        give.fireSignal('card-expanded', null, null, this)
      }
      this.expandIcon = newValue ? 'expand-less' : 'expand-more'
      this.$.cardContent.classList.remove(newValue ? 'collapsed' : 'flex')
      this.$.cardContent.classList.add(newValue ? 'flex' : 'collapsed')
      this._toggleCollapseHeader(newValue)
      if (this._readiness) {
        beforeNextRender(this, () => this._updateHeight())
      }
    }

    toggleCollapse () {
      // hide cardBodySlot and convert GenemoHead to GenemoCollapse (if any)
      this.isOpened = !this.isOpened
    }

    collapse () {
      if (!this.disableFolding) {
        this.isOpened = false
      }
    }

    expand () {
      this.isOpened = true
    }

    populateDOM () {
      // if the content has a .getExpandedHeader member,
      //  it will be used to generate the node to replace the node
      //  given in .head
      // This procedure also calculates the required height of the content
      //  to be set as flex-shrink and flex-basis
      let contentNodes = this.$.cardBodySlot.assignedNodes({ flatten: true })
      let headerContainer =
        this.shadowRoot.querySelector('#cardHeaderContainer')
      if (!headerContainer) {
        return
      }
      while (headerContainer.firstChild) {
        headerContainer.removeChild(headerContainer.firstChild)
      }
      if (contentNodes && contentNodes[0]) {
        let node = contentNodes[0]
        let newHead = node.expandedHeaderElement
        if (newHead) {
          headerContainer.appendChild(newHead)
          this.$.hiddenCardHeaderHolder.appendChild(this.$.cardHeaderSlot)
        } else {
          // populate header with #cardhead
          headerContainer.appendChild(this.$.cardHeaderSlot)
          // newHead = this.$.cardHeaderSlot.assignedNodes({ flatten: true })
          // if (newHead) {
          //   newHead.forEach(node => headerContainer.appendChild(node))
          // }
        }
      }
      this._updateHeight()
    }

    _updateHeight (e) {
      let headerHeight = parseFloat(window.getComputedStyle(this.$.cardHeader)
        .getPropertyValue('height')
      )
      let marginHeight = parseFloat(window
        .getComputedStyle(this.shadowRoot.host).getPropertyValue('margin-top')
      ) +
      parseFloat(window.getComputedStyle(this.shadowRoot.host)
        .getPropertyValue('margin-bottom')
      )
      let contentHeight = 0
      let node = null
      if (this.isOpened) {
        let contentNodes = this.$.cardBodySlot.assignedNodes({ flatten: true })
        if (contentNodes && contentNodes[0]) {
          node = contentNodes[0]
          contentHeight = parseInt(node.contentHeight ||
            window.getComputedStyle(node).getPropertyValue('height'))
        }
        headerHeight += marginHeight
      }
      this.shadowRoot.host.style.setProperty('min-height',
        (((node && node.minContentHeight) ? node.minContentHeight : 0) +
          headerHeight) + 'px')
      this.shadowRoot.host.style.setProperty('flex-basis',
        (headerHeight + contentHeight) + 'px')
      this.shadowRoot.host.style.setProperty('flex-grow',
        (node && node.allowFlexGrow) ? '1' : '0')
      this.shadowRoot.host.style.setProperty('flex-shrink',
        (node && node.allowFlexShrink)
          ? ((node.minContentHeight
            ? Math.max(contentHeight - node.minContentHeight, 0)
            : contentHeight) * this.constructor.FLEX_CORRECTION_COEFFICIENT /
            (headerHeight + contentHeight)) + ''
          : '0'
      )
      if (!(e instanceof window.Event)) {
        give.fireSignal('update-height', null, null, this)
      }
    }

    _setContentReady (flag) {
      if (this._readiness !== flag) {
        if (flag) {
          // check if all assigned nodes have their readiness set to `true`
          if (this.$.cardBodySlot.assignedNodes({ flatten: true })
            .every(node => node.readiness)
          ) {
            this._updateHeight()
            this._readiness = true
          }
        } else {
          this._readiness = false
        }
      }
      return this._readiness
    }

    _contentReadyHandler (e) {
      try {
        this._setContentReady(e.detail.flag)
        if (e.preventDefault) {
          e.stopPropagation()
          e.preventDefault()
        }
      } catch (error) {
        give.fireSignal('warning', { errObj: error }, null, this)
      }
    }
  }

  GiveCard.FLEX_CORRECTION_COEFFICIENT = 10
  give.GiveCard = GiveCard
  window.customElements.define('give-card', give.GiveCard)

  return give
})(GIVe || {})
