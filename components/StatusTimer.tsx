'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface StatusTimerProps {
    createDate: string;
    status: string;
    showLabel?: boolean;
}

/**
 * Robust date parser synchronized with server-side logic.
 * Handles:
 * 1. "DD Mon YY - HH:mm" (Format A)
 * 2. "Mon DD YYYY HH:mmAM/PM" (Format B)
 * 3. ISO Strings
 */
function useDuration(dateStr: string) {
    const [duration, setDuration] = useState<string>('00:00:00');

    useEffect(() => {
        const parseDate = (str: string) => {
            if (!str) return null;
            
            try {
                // Return if already an ISO string (contains T and Z or + offset)
                if (str.includes('T') && (str.includes('Z') || str.includes('+'))) {
                    const d = new Date(str);
                    return isNaN(d.getTime()) ? null : d;
                }

                const months: Record<string, number> = {
                    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
                    'mei': 4, 'des': 11, 'ags': 7, 'agu': 7, 'okt': 9,
                };

                let year, month, day, hour, minute;
                let ampm = null;

                // Format A: "DD Mon YY - HH:mm" (e.g. "13 Mar 26 - 15:09")
                const matchA = str.match(/(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{2,4})\s*-?\s*(\d{1,2}):(\d{2})/);
                if (matchA) {
                    day = parseInt(matchA[1]);
                    month = months[matchA[2].toLowerCase()] ?? 0;
                    year = parseInt(matchA[3]);
                    if (year < 100) year += 2000;
                    hour = parseInt(matchA[4]);
                    minute = parseInt(matchA[5]);
                } else {
                    // Format B: "Mon DD YYYY HH:mmAM/PM" (e.g. "Mar 13 2026 3:09PM")
                    const matchB = str.match(/([a-zA-Z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
                    if (matchB) {
                        month = months[matchB[1].toLowerCase()] ?? 0;
                        day = parseInt(matchB[2]);
                        year = parseInt(matchB[3]);
                        hour = parseInt(matchB[4]);
                        minute = parseInt(matchB[5]);
                        ampm = matchB[6]?.toUpperCase();
                    } else {
                        // Fallback to native
                        const d = new Date(str);
                        return isNaN(d.getTime()) ? null : d;
                    }
                }

                if (ampm === 'PM' && hour < 12) hour += 12;
                if (ampm === 'AM' && hour === 12) hour = 0;

                // Date in browser local time (but constructed from WIB numbers)
                const date = new Date(year, month, day, hour, minute, 0);
                
                // Adjust for WIB (UTC+7)
                // Browser offset is in minutes, e.g. -420 for WIB, 0 for UTC.
                // We want to treat the input as UTC+7.
                const browserOffset = -new Date().getTimezoneOffset(); // e.g. 420 for WIB
                const wibOffset = 420;
                const adjustment = browserOffset - wibOffset;
                
                date.setMinutes(date.getMinutes() - adjustment);
                return date;
            } catch (e) {
                return null;
            }
        };

        const startDate = parseDate(dateStr);
        if (!startDate) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = Math.max(0, now.getTime() - startDate.getTime());

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [dateStr]);

    return duration;
}

export function StatusTimer({ createDate, status, showLabel = true }: StatusTimerProps) {
    const duration = useDuration(createDate);
    const s = (status || '').toUpperCase().trim().replace(/[\s\.\-]+/g, '_');

    const activeStatuses = ['OPEN', 'FOLLOW_UP', 'RUNNING', 'CHECKED', 'PENDING'];
    if (!activeStatuses.includes(s)) return null;

    const labelMap: Record<string, string> = {
        'OPEN': 'Open',
        'FOLLOW_UP': 'Follow Up',
        'RUNNING': 'Running',
        'CHECKED': 'Running',
        'PENDING': 'Pending',
    };

    const currentLabel = labelMap[s] || status;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider shadow-sm transition-all duration-300">
            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            <span>{showLabel && `${currentLabel}: `}{duration}</span>
        </div>
    );
}
