/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   animations/slide-from-left-animation.html
 */

/// <reference path="../../polymer/types/polymer.d.ts" />
/// <reference path="../neon-animation-behavior.d.ts" />

/**
 * `<slide-from-left-animation>` animates the transform of an element from
 * `translateX(-100%)` to `none`.
 * The `transformOrigin` defaults to `0 50%`.
 *
 * Configuration:
 * ```
 * {
 *   name: 'slide-from-left-animation',
 *   node: <node>,
 *   transformOrigin: <transform-origin>,
 *   timing: <animation-timing>
 * }
 * ```
 */
interface SlideFromLeftAnimationElement extends Polymer.Element, Polymer.NeonAnimationBehavior {
  configure(config: any): any;
}

interface HTMLElementTagNameMap {
  "slide-from-left-animation": SlideFromLeftAnimationElement;
}