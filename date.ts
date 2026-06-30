/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
};

export const formatTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

export const formatDateTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${formatDate(isoString)} at ${formatTime(isoString)}`;
  } catch {
    return isoString;
  }
};

export const getRelativeTimeDescription = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const diff = d.getTime() - new Date().getTime();
    const diffHours = Math.round(diff / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `Overdue by ${Math.abs(diffHours)} hrs`;
    } else if (diffHours === 0) {
      return 'Due now';
    } else if (diffHours < 24) {
      return `Due in ${diffHours} hrs`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      return `Due in ${diffDays} days`;
    }
  } catch {
    return isoString;
  }
};
