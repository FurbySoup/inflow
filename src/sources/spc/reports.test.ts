import { describe, expect, it } from 'vitest'
import todayCsv from './fixtures/today.csv?raw'
import { parseReportsCsv, stormReports } from './reports'

const NOW = new Date('2026-10-10T18:50:00Z')

describe('parseReportsCsv', () => {
  it('parses the recorded fixture: tornado row kept, empty wind/hail sections yield nothing', () => {
    const reports = parseReportsCsv(todayCsv, NOW)
    expect(reports).toHaveLength(1)
    const [tor] = reports
    expect(tor.kind).toBe('tornado')
    expect(tor.time).toBe('2026-10-10T18:33:00.000Z')
    expect(tor.location).toEqual([-81.6, 32.55])
    expect(tor.magnitude).toBe('UNK')
    expect(tor.comments).toContain('Picture of ongoing tornado')
  })

  it('parses three populated sections, keeps commas in comments, and dates early-UTC times on the next day', () => {
    const csv = [
      'Time,F_Scale,Location,County,State,Lat,Lon,Comments',
      '0105,EF1,4 NNE Bowman,Bamberg,SC,33.30,-81.10,Roof damage, siding and trees down',
      '1950,UNK,2 W Town,Burke,GA,33.00,-82.00,Funnel reported',
      'Time,Speed,Location,County,State,Lat,Lon,Comments',
      '2301,65,2 SW Town,Burke,GA,33.00,-82.00,Trees down, power lines',
      'Time,Size,Location,County,State,Lat,Lon,Comments',
      '1744,150,Town,Burke,GA,33.10,-82.10,Quarter size, hail',
    ].join('\n')

    const reports = parseReportsCsv(csv, NOW)
    expect(reports.map((r) => r.kind)).toEqual(['tornado', 'tornado', 'wind', 'hail'])

    const [first, , wind, hail] = reports
    expect(first.time).toBe('2026-10-11T01:05:00.000Z')
    expect(first.magnitude).toBe('EF1')
    expect(first.comments).toBe('Roof damage, siding and trees down')
    expect(first.location).toEqual([-81.1, 33.3])

    expect(wind.magnitude).toBe('65')
    expect(wind.comments).toBe('Trees down, power lines')
    expect(hail.comments).toBe('Quarter size, hail')
  })

  it('skips rows before the first header and rows with bad coordinates', () => {
    const csv = [
      '1200,EF0,Stray,,,30.0,-80.0,No section yet',
      'Time,F_Scale,Location,County,State,Lat,Lon,Comments',
      '1200,EF0,Bad,,,n/a,-80.0,Bad latitude',
      '1210,EF0,Empty lat,,,,-80.0,Blank latitude',
      '1220,EF0,Empty lon,,,30.0,,Blank longitude',
      '1300,EF0,Good,,,30.0,-80.0,Kept',
    ].join('\n')
    const reports = parseReportsCsv(csv, NOW)
    expect(reports).toHaveLength(1)
    expect(reports[0].comments).toBe('Kept')
  })

  it('dates a report on the previous calendar day when the SPC day started the day before', () => {
    const csv = ['Time,F_Scale,Location,County,State,Lat,Lon,Comments', '1833,UNK,Town,,,30.0,-80.0,Late'].join('\n')
    const [r] = parseReportsCsv(csv, new Date('2026-10-11T05:00:00Z'))
    expect(r.time).toBe('2026-10-10T18:33:00.000Z')
  })
})

describe('stormReports.normalize', () => {
  it('is pure: the same raw input gives the same output', () => {
    const raw = { csv: todayCsv, fetchedAt: '2026-10-10T18:50:00.000Z' }
    const a = stormReports.normalize(raw)
    expect(a).toHaveLength(1)
    expect(stormReports.normalize(raw)).toEqual(a)
    expect(a[0].time).toBe('2026-10-10T18:33:00.000Z')
  })
})
