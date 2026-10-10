import { IEM_RADAR_VALID_URL } from './iem'
import { parseValidTime } from './frames'

/** Epoch ms of the newest NEXRAD composite frame. Rejects if the endpoint fails or is malformed. */
export async function fetchRadarValidTime(signal?: AbortSignal): Promise<number> {
  const res = await fetch(IEM_RADAR_VALID_URL, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`IEM radar time ${res.status}`)
  const ms = parseValidTime(await res.json())
  if (ms === null) throw new Error('IEM radar time: no meta.valid')
  return ms
}
