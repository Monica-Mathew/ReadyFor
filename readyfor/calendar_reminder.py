from datetime import datetime, timedelta, timezone
from uuid import uuid5, NAMESPACE_URL


def escape(value):
    slash = chr(92)
    return value.replace(slash, slash * 2).replace(chr(13) + chr(10), chr(10)).replace(chr(13), chr(10)).replace(chr(10), slash + 'n').replace(';', slash + ';').replace(',', slash + ',')


def fold(line):
    parts, current = [], ''
    for char in line:
        if len((current + char).encode('utf-8')) > 75:
            parts.append(current)
            current = ' '
        current += char
    parts.append(current)
    return '\r\n'.join(parts)


def make_calendar(departure, activity, destination):
    utc = lambda value: value.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    uid = str(uuid5(NAMESPACE_URL, departure.isoformat() + activity + destination)) + '@readyfor'
    lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ReadyFor//Leave reminder//EN',
        'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + uid,
        'DTSTAMP:' + utc(datetime.now(timezone.utc)), 'DTSTART:' + utc(departure),
        'DTEND:' + utc(departure + timedelta(minutes=5)),
        'SUMMARY:' + escape('Time to leave: ' + activity), 'LOCATION:' + escape(destination),
        'DESCRIPTION:' + escape('Leave for ' + activity + '. Check your route for service updates. If you change routes in ReadyFor, update this calendar event.'),
        'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY',
        'DESCRIPTION:' + escape('Time to leave for ' + activity),
        'END:VALARM', 'END:VEVENT', 'END:VCALENDAR',
    ]
    return '\r\n'.join(fold(line) for line in lines) + '\r\n'
