import '../../../@polymer/iron-flex-layout/iron-flex-layout.js';
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="give-shared-styles">
  <template>
    <style>

    /************************** Polymer and Material Design colors below *********************/

    :root {
      --dark-primary-color: #303F9F;
      --default-primary-color: #3F51B5;
      --default-primary-color-lighten: #5C6BC0;
      --light-primary-color: #C5CAE9;
      --dark-theme-text-color: #ffffff; /*text/icons*/
      --accent-color: #FF8F00;
      --primary-background-color: #EAEAEA;
      --primary-text-color: #212121;
      --secondary-text-color: #727272;
      --disabled-text-color: #BDBDBD;
      --divider-color: #B6B6B6;
      --card-background-color: #F5F5F5;
      --card-header-background-color: #DADADA;
      --button-background-color: rgba(245, 245, 245, 0.2);
      --lighter-accent-color: #FFE082;
      --error-color: #B71C1C;

      /** These are reserved for Polymer 2.0 update */
      --primary-text-opacity: 0.87;
      --secondary-text-opacity: 0.54;
      --disabled-text-opacity: 0.38;
      --divider-opacity: 0.12;

      --primary-text-opacity-light: 1.00;
      --secondary-text-opacity-light: 0.70;
      --disabled-text-opacity-light: 0.50;
      --divider-opacity--light: 0.12;
      --default-font-size: 12px;
    }

    paper-button {
      background: var(--button-background-color);
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      line-height: 1.2em;
      margin: 0.3em 0;
    }

    paper-button.colored {
      background: var(--default-primary-color);
      color: var(--dark-theme-text-color);
    }

    paper-button[disabled] {
      background: var(--card-background-color);
      color: var(--disabled-text-color);
      cursor: auto;
      pointer-events: none;
    }

    paper-button[disabled].colored {
      background: var(--primary-background-color);
      color: var(--disabled-text-color);
      cursor: auto;
      pointer-events: none;
    }

    paper-button[toggles] {
      transition: background-color 0.3s;
    }

    paper-button[toggles][active] {
      background-color: rgba(0, 0, 0, 0.25);
    }

    paper-toolbar paper-button {
      margin: 0 0.5em;
      background: var(--default-primary-color-lighten);
    }

    div {
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      line-height: 1.2em;
    }

    paper-toolbar div {
      margin: 0 0.5em;
      cursor: pointer;
    }

    paper-toolbar div.tooltipMouseOver:hover {
      color: var(--accent-color);
    }

    paper-tabs {
      --paper-tabs-selection-bar-color: var(--default-primary-color);
    }

    neon-animated-pages > * {
      /*position: relative;     may need to change for animation */
    }

    /************************** Polymer and Material Design size and others below *********************/

    paper-input {
      --paper-input-container: {
        padding: 0.3em 0;
      };
      --paper-input-container-input: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
      };
      --paper-input-container-label: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
      };
    }

    paper-dropdown-menu {
      --paper-menu-button: {
        padding-top: 0em;
        padding-bottom: 0.3em;
      };
      --paper-input-container: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
        padding: 0.3em 0;
      };
      --paper-input-container-input: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
      };
      --paper-input-container-label: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
      };
      --paper-input-container-suffix: {
        font-size: var(--base-font-size, var(--default-font-size));
        line-height: 1.5em;
      };
    }

    paper-tooltip {
      --paper-tooltip: {
        max-width: 300px;
        min-width: 250px;
        width: auto;
        padding: 1em;
        font-size: 1.2em;
        white-space: normal;
        line-height: 1.4em;
        margin-top: 1px;
        margin-bottom: 3px;
        z-index: 20;
      };
    }

    paper-toolbar paper-tooltip {
      --paper-tooltip: {
        max-width: 400px;
        min-width: 250px;
        width: auto;
        padding: 1em;
        font-size: 1.2em;
        white-space: normal;
        line-height: 1.4em;
        margin-top: 1px;
        margin-bottom: 3px;
        z-index: 20;
      };
    }

    iron-icon.transparent {
      opacity: 0.54;
    }

    iron-icon.transparent:hover {
      opacity: 0.87;
    }

    /************************** Genemo shared classes below *********************/

    div#genemoFirstContainer {
      @apply --layout-fit;
      padding: 0.8em;
    }

    search-card-content {
      width: 240px;
    }

    .genemoLogo {
      width: 240px;
    }

    give-card#trackSelectionPanel {
      width: 500px;
    }

    give-card#resultPanel {
      width: 300px;
      margin: 0px;
    }

    give-card.flexFillCard {
      --give-card-material-mixin: {
        @apply --layout-fit;
        @apply --layout-vertical;
      };
      --give-card-fixed-content-mixin: {
        @apply --layout-flex;
        position: relative;
      };
    }

    .fullWidth {
      width: 100%;
      margin-left: 0;
      margin-right: 0;
    }

    iron-icon.smallInline {
      width: 1.25em;
      height: 1.25em;
      margin: 0 0.25em;
    }
    iron-icon.transparent {
      opacity: 0.54;
    }
    iron-icon.transparent:hover {
      opacity: 0.87;
    }

    .paper-button-text {
      display: inline-block;
      text-transform: uppercase;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      padding: 0.1em 1em;
      margin: 0 0.25em 0.1em 0.25em;
      border-radius: 3px;
      box-shadow: 0 1px 4px 1px #9E9E9E;
    }

    .paper-button-text.colored {
      background: #3F51B5;
      color: #FFF;
    }

    .paper-input-text {
      display: inline-block;
      border-bottom: 1px #3F51B5 solid;
      padding-right: 1em;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      color: #3F51B5;
    }

    .give-card-title {
      display: inline-block;
      font-family: 'Roboto', Arial, Helvetica, sans-serif;
      font-weight: 700;
      background: #E0E0E0;
      text-transform: capitalize;
      padding: 0.1em 0.25em;
      margin: 0.1em 0.25em;
    }

    a {
      text-decoration: none;
      color: inherit;
    }

    a:not(.buttonLink):link {
      color: var(--accent-color);
      text-decoration: none;
    }
    a:not(.buttonLink):hover {
      text-decoration: underline;
    }
    a:not(.buttonLink):active {
      text-decoration: underline;
    }
    a:not(.buttonLink):visited {
      color: var(--default-primary-color);
    }

    .fullWidth {
      width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
    .halfWidth {
      width: 49%;
      margin-left: 0;
      margin-right: 0;
    }

    .vertCenterContainer {
      display: table;
      width: 100%;
    }

    .vertCenterContainer > * {
      display: table-cell;
      vertical-align: middle;
    }

    .vertCenterContainer > :not(paper-icon-button) {
      width: 100%;
    }

    .vertTextBottomContainer {
      display: table;
      width: 100%;
    }

    .vertTextBottomContainer > * {
      display: table-cell;
      vertical-align: middle;
    }

    .clearFix:after {
      content: "";
      display: table;
      clear: both;
    }

    .leftFloat {
      float: left;
    }

    .rightFloat {
      float: right;
    }

    .inlineDiv {
      display: inline-block;
      padding: 0.2em 0;
    }

    .noTextTransformButton {
      text-transform: none;
    }

    .vertCenterElement {
      padding: 0px;
      width: 100%;
    }

    .vertCenterContainer > div.hidden {
      display: none;
    }

    div#loadingBlock {
      display: block;
      pointer-events: none;
      @apply --layout-fit;
      z-index: 100;
      opacity: 0.8;
      background: var(--card-background-color);
    }
    div#loadingBlock paper-spinner {
      position: absolute;
      top: 50%;
      margin-top: -12px;
      left: 50%;
      margin-left: -12px;
      height: 24px;
      width: 24px;
      opacity: 1;
    }
    </style>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
