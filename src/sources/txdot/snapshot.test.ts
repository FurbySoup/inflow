import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSnapshotDataUrl } from './snapshot'

const URL_A = '/api/txdot/its/DistrictIts/GetCctvSnapshotByIcdId?icdId=A&districtCode=AUS'

function jpegResponse(): Response {
  return new Response(JSON.stringify({ icd_Id: 'A', snippet: '/9j/AA' }), { status: 200 })
}

describe('fetchSnapshotDataUrl in-flight dedupe', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shares one network call between concurrent requests for the same URL', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jpegResponse())
    const [a, b] = await Promise.all([fetchSnapshotDataUrl(URL_A), fetchSnapshotDataUrl(URL_A)])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(a).toBe('data:image/jpeg;base64,/9j/AA')
    expect(b).toBe(a)
  })

  it('fetches again once the earlier request has settled', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jpegResponse())
    await fetchSnapshotDataUrl(URL_A)
    await fetchSnapshotDataUrl(URL_A)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('does not share requests for different URLs', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jpegResponse())
    await Promise.all([fetchSnapshotDataUrl(URL_A), fetchSnapshotDataUrl(`${URL_A}X`)])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('clears the entry after a failure so the next call retries', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => new Response('nope', { status: 500 }))
      .mockImplementationOnce(async () => jpegResponse())
    await expect(fetchSnapshotDataUrl(URL_A)).rejects.toThrow('TxDOT snapshot 500')
    await expect(fetchSnapshotDataUrl(URL_A)).resolves.toBe('data:image/jpeg;base64,/9j/AA')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
