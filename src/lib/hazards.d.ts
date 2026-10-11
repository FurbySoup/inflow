import type { Alert } from '../types';
/**
 * Hazard classification shared by the alert rows, top-bar threat button, toasts and map (INFLOW v1 §6).
 * Codes follow the NWS hazards-map legend; anything else is OTHER (still listed, never toasted).
 */
export type HazardCode = 'TOR' | 'SVR' | 'FFW' | 'TOA' | 'SVA' | 'SPS' | 'OTHER';
export declare function hazardCode(event: string): HazardCode;
/** Watches render with a dashed hazard border; warnings with a solid fill. */
export declare const isWatch: (event: string) => boolean;
/** Tornado or Flash Flood Emergency (NWS CATASTROPHIC damage threat). */
export declare const isEmergency: (a: Pick<Alert, "damageThreat">) => boolean;
/** PDS treatment: explicit PDS text, any emergency, or a CONSIDERABLE tornado damage threat on a TOR. */
export declare function isPds(a: Pick<Alert, 'event' | 'pds' | 'damageThreat'>): boolean;
/** Sort key per the design spec: PDS → TOR → SVR → FFW → TOA → SVA → SPS → other, then soonest expiry. */
export declare function compareAlerts(a: Alert, b: Alert): number;
/** The alert the threat button and default focus point at: most severe TOR (PDS first), soonest expiry. Null when there is none. */
export declare function mostSevereTornado(alerts: Alert[]): Alert | null;
