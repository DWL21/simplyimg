import { useMemo } from 'react';
import { wasmClient } from '../lib/wasmClient';

export function useWasm() {
  return useMemo(
    () => ({
      isReady: wasmClient.isReady,
      getInfo: wasmClient.getInfo,
      process: wasmClient.process,
    }),
    [],
  );
}
