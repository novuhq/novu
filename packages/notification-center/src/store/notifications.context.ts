import React from 'react';
import { INotificationsContext } from '../shared/interfaces';

export const NotificationsContext = React.createContext<INotificationsContext | null>(null);
