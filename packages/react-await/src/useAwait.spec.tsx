import { ErrorBoundary, Suspense } from '@suspensive/react'
import { ERROR_MESSAGE, FALLBACK, TEXT, delay } from '@suspensive/test-utils'
import { render, screen, waitFor } from '@testing-library/react'
import ms from 'ms'
import { describe, expect, it } from 'vitest'
import { AwaitClient, AwaitClientProvider, UseAwait, useAwait } from '.'

const key = (id: number) => ['key', id] as const

const AwaitSuccess = () => {
  const awaited = useAwait({ key: key(1), fn: () => delay(ms('0.1s')).then(() => TEXT) })

  return (
    <>
      {awaited.data}
      <button onClick={awaited.reset}>Try again</button>
    </>
  )
}

const AwaitFailure = () => {
  const awaited = useAwait({
    key: key(1),
    fn: () => delay(ms('0.1s')).then(() => Promise.reject(new Error(ERROR_MESSAGE))),
  })

  return <>{awaited.data}</>
}

describe('<Await />', () => {
  it('should render child component with data from useAwait hook', async () => {
    const client = new AwaitClient()

    render(
      <Suspense fallback="Loading...">
        <UseAwait options={{ key: key(1), fn: () => Promise.resolve(TEXT) }}>{({ data }) => <>{data}</>}</UseAwait>
      </Suspense>,
      { wrapper: ({ children }) => <AwaitClientProvider client={client}>{children}</AwaitClientProvider> }
    )

    expect(await screen.findByText(TEXT)).toBeInTheDocument()
  })
})

describe('useAwait', () => {
  it('should return object containing data field with only success, and It will be cached', async () => {
    const { unmount } = render(
      <Suspense fallback={FALLBACK}>
        <AwaitSuccess />
      </Suspense>
    )
    expect(screen.queryByText(FALLBACK)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(TEXT)).toBeInTheDocument())

    // success data cache test
    unmount()
    render(
      <Suspense fallback={FALLBACK}>
        <AwaitSuccess />
      </Suspense>
    )
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument()
    expect(screen.queryByText(TEXT)).toBeInTheDocument()
  })

  it('should throw Error, and It will be cached', async () => {
    const { unmount } = render(
      <ErrorBoundary fallback={(props) => <>{props.error.message}</>}>
        <Suspense fallback={FALLBACK}>
          <AwaitFailure />
        </Suspense>
      </ErrorBoundary>
    )
    expect(screen.queryByText(FALLBACK)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(ERROR_MESSAGE)).toBeInTheDocument())

    // error cache test
    unmount()
    render(
      <ErrorBoundary fallback={(props) => <>{props.error.message}</>}>
        <Suspense fallback={FALLBACK}>
          <AwaitFailure />
        </Suspense>
      </ErrorBoundary>
    )
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument()
    expect(screen.queryByText(ERROR_MESSAGE)).toBeInTheDocument()
  })

  it('should return object containing reset method to reset cache by key', async () => {
    const { rerender } = render(
      <Suspense fallback={FALLBACK}>
        <AwaitSuccess />
      </Suspense>
    )
    expect(screen.queryByText(FALLBACK)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(TEXT)).toBeInTheDocument())
    const resetButton = await screen.findByRole('button', { name: 'Try again' })
    resetButton.click()
    rerender(
      <Suspense fallback={FALLBACK}>
        <AwaitSuccess />
      </Suspense>
    )
    expect(screen.queryByText(FALLBACK)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(TEXT)).toBeInTheDocument())
  })
})
