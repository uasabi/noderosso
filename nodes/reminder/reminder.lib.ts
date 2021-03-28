import { Node } from 'node-red'
import { Actions, Events } from './reminder.common'
import {google} from 'googleapis';
import {DateTime} from 'luxon';

export function Setup({ node }: { node: Node }) {
  const creds = node.credentials as any;
  const auth = new google.auth.OAuth2(creds.clientId, creds.clientSecret, creds.redirectUri);
  auth.setCredentials({
    refresh_token: creds.refreshToken,
    access_token: creds.accessToken
  });
  const client = google.calendar({version: 'v3', auth});
  return async (action: Actions, send: (event: Events) => void, done: () => void) => {
    if(action.topic === 'TICK.V1'){
      node.log(`Checking calendars`);
      const now = DateTime.now();
      for(const calendar of (await client.calendarList.list()).data.items || []){
        node.log(`Checking calendar ID: ${calendar.id}`);
        if(calendar.id)
          for(const event of (await client.events.list({
            calendarId: calendar.id,
            singleEvents: true,
            q: 'REMINDER',
            timeZone: 'UTC',
            timeMax: now.toISO()
          })).data.items || []){
            node.log(`Checking event ${event.summary}`)
            if(event.id !== null && event.summary?.startsWith('REMINDER')){
              const eventStart = event.start?.dateTime || event.start?.date;
              if(typeof(eventStart) === 'string') {
                node.log(`Updating event ${event.summary}`)
                const eventEnd = event.end?.dateTime || event.end?.date;
                let eventStartDate = DateTime.fromISO(eventStart);
                const duration = typeof(eventEnd) === 'string' && DateTime.fromISO(eventEnd).diff(eventStartDate);
                eventStartDate = eventStartDate.set({year: now.year, month: now.month, day: now.day});
                const updateResponse = await client.events.patch({
                  calendarId: calendar.id,
                  eventId: event.id,
                  requestBody: {
                    start: {
                      dateTime: eventStartDate.toISO(),
                      timeZone: 'UTC'
                    },
                    ...(duration? {
                      end: {
                        dateTime: eventStartDate.plus(duration).toISO(),
                        timeZone: 'UTC'
                      }
                    } : {})
                  }
                })
                if(updateResponse.status < 200 || updateResponse.status >= 300){
                  node.error(`Could not update ${event.summary}: ${updateResponse.statusText}`)
                }else{
                  node.log(`Update succeeded to start time: ${eventStartDate.toISO()} ${updateResponse.statusText}`);
                }
              }else{
                node.warn(`Event ${event.summary} has no start date`)
              }
            }
          }
        }
      return done()
    }
  }
}
