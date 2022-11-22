/* tslint:disable */
/* eslint-disable */
/* auto-generated angular directive proxies */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, NgZone } from '@angular/core';
import { ProxyCmp, proxyOutputs } from './angular-component-lib/utils';

import { Components } from '@novu/notification-center-core';

export declare interface AccordionComponent extends Components.AccordionComponent {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['body', 'dataTestId', 'header'],
})
@Component({
  selector: 'accordion-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['body', 'dataTestId', 'header'],
})
export class AccordionComponent {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ActionWrapper extends Components.ActionWrapper {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['notification'],
})
@Component({
  selector: 'action-wrapper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['notification'],
})
export class ActionWrapper {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ArrowLeft extends Components.ArrowLeft {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'arrow-left',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class ArrowLeft {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface BellIcon extends Components.BellIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'width'],
})
@Component({
  selector: 'bell-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'width'],
})
export class BellIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ChannelPreference extends Components.ChannelPreference {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['active', 'disabled', 'type'],
})
@Component({
  selector: 'channel-preference',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['active', 'disabled', 'type'],
})
export class ChannelPreference {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ChannelPreferences extends Components.ChannelPreferences {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['setting'],
})
@Component({
  selector: 'channel-preferences',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['setting'],
})
export class ChannelPreferences {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ChatIcon extends Components.ChatIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'width'],
})
@Component({
  selector: 'chat-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'width'],
})
export class ChatIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CheckIcon extends Components.CheckIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'check-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class CheckIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface ChevronIcon extends Components.ChevronIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'chevron-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class ChevronIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface CogIcon extends Components.CogIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'cog-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class CogIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface EmailIcon extends Components.EmailIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'width'],
})
@Component({
  selector: 'email-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'width'],
})
export class EmailIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface FeedTabLabel extends Components.FeedTabLabel {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['api', 'isActive', 'query', 'socketUrl', 'tab', 'token'],
})
@Component({
  selector: 'feed-tab-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['api', 'isActive', 'query', 'socketUrl', 'tab', 'token'],
})
export class FeedTabLabel {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface LoadingIcon extends Components.LoadingIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'stroke', 'width'],
})
@Component({
  selector: 'loading-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'stroke', 'width'],
})
export class LoadingIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface MobileIcon extends Components.MobileIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'width'],
})
@Component({
  selector: 'mobile-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'width'],
})
export class MobileIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationButton extends Components.NotificationButton {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['index', 'messageAction'],
})
@Component({
  selector: 'notification-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['index', 'messageAction'],
})
export class NotificationButton {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationCenter extends Components.NotificationCenter {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'notification-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class NotificationCenter {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationCenterFooter extends Components.NotificationCenterFooter {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'notification-center-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class NotificationCenterFooter {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationsHeaderRow extends Components.NotificationsHeaderRow {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['showUnseenBadge', 'unseenCount'],
})
@Component({
  selector: 'notifications-header-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['showUnseenBadge', 'unseenCount'],
})
export class NotificationsHeaderRow {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationsListItem extends Components.NotificationsListItem {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['notification'],
})
@Component({
  selector: 'notifications-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['notification'],
})
export class NotificationsListItem {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationsTab extends Components.NotificationsTab {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['onSettingsBtnClick', 'tabs'],
})
@Component({
  selector: 'notifications-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['onSettingsBtnClick', 'tabs'],
})
export class NotificationsTab {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NotificationsTabHeader extends Components.NotificationsTabHeader {
  /**
   *
   */
  settingsBtnClick: EventEmitter<CustomEvent<MouseEvent | TouchEvent>>;
}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['hasTabs', 'unseenCount'],
})
@Component({
  selector: 'notifications-tab-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['hasTabs', 'unseenCount'],
})
export class NotificationsTabHeader {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
    proxyOutputs(this, this.el, ['settingsBtnClick']);
  }
}

export declare interface NovuIcon extends Components.NovuIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'novu-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class NovuIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface NovuProvider extends Components.NovuProvider {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: [
    'applicationIdentifier',
    'backendUrl',
    'colorScheme',
    'i18n',
    'socketUrl',
    'stores',
    'subscriberHash',
    'subscriberId',
  ],
})
@Component({
  selector: 'novu-provider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: [
    'applicationIdentifier',
    'backendUrl',
    'colorScheme',
    'i18n',
    'socketUrl',
    'stores',
    'subscriberHash',
    'subscriberId',
  ],
})
export class NovuProvider {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface SettingsAction extends Components.SettingsAction {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'settings-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class SettingsAction {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface SettingsButton extends Components.SettingsButton {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'settings-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class SettingsButton {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface SmsIcon extends Components.SmsIcon {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['height', 'width'],
})
@Component({
  selector: 'sms-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['height', 'width'],
})
export class SmsIcon {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface StencilConsumer extends Components.StencilConsumer {
  /**
   *
   */
  mountConsumer: EventEmitter<CustomEvent<any>>;
}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['contextName', 'renderer'],
})
@Component({
  selector: 'stencil-consumer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['contextName', 'renderer'],
})
export class StencilConsumer {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
    proxyOutputs(this, this.el, ['mountConsumer']);
  }
}

export declare interface StencilProvider extends Components.StencilProvider {
  /**
   *
   */
  mountConsumer: EventEmitter<CustomEvent<any>>;
}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['STENCIL_CONTEXT', 'contextName'],
})
@Component({
  selector: 'stencil-provider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['STENCIL_CONTEXT', 'contextName'],
})
export class StencilProvider {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
    proxyOutputs(this, this.el, ['mountConsumer']);
  }
}

export declare interface StencilQuery extends Components.StencilQuery {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['listen', 'options', 'renderChildren'],
})
@Component({
  selector: 'stencil-query',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['listen', 'options', 'renderChildren'],
})
export class StencilQuery {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface SubscriberPreferencesList extends Components.SubscriberPreferencesList {}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'subscriber-preferences-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class SubscriberPreferencesList {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface SwitchComponent extends Components.SwitchComponent {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['checked', 'dataTestId', 'disabled', 'onChange'],
})
@Component({
  selector: 'switch-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['checked', 'dataTestId', 'disabled', 'onChange'],
})
export class SwitchComponent {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface TabComponent extends Components.TabComponent {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['active', 'label'],
})
@Component({
  selector: 'tab-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['active', 'label'],
})
export class TabComponent {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface TabsComponent extends Components.TabsComponent {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['active', 'tabs'],
})
@Component({
  selector: 'tabs-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['active', 'tabs'],
})
export class TabsComponent {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface TimeMark extends Components.TimeMark {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['notification'],
})
@Component({
  selector: 'time-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['notification'],
})
export class TimeMark {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface UserPreferencesHeader extends Components.UserPreferencesHeader {
  /**
   *
   */
  backButtonClick: EventEmitter<CustomEvent<MouseEvent | TouchEvent>>;
}

@ProxyCmp({
  defineCustomElementFn: undefined,
})
@Component({
  selector: 'user-preferences-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
})
export class UserPreferencesHeader {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
    proxyOutputs(this, this.el, ['backButtonClick']);
  }
}

export declare interface WorkflowHeader extends Components.WorkflowHeader {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['setting'],
})
@Component({
  selector: 'workflow-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['setting'],
})
export class WorkflowHeader {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}

export declare interface WorkflowText extends Components.WorkflowText {}

@ProxyCmp({
  defineCustomElementFn: undefined,
  inputs: ['color', 'dataTestId', 'size', 'text'],
})
@Component({
  selector: 'workflow-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: ['color', 'dataTestId', 'size', 'text'],
})
export class WorkflowText {
  protected el: HTMLElement;
  constructor(c: ChangeDetectorRef, r: ElementRef, protected z: NgZone) {
    c.detach();
    this.el = r.nativeElement;
  }
}
