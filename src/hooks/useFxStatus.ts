import { useEffect, useState } from "react";
import { getFxStatus, subscribeFxStatus, type FxStatus } from "../services/fxRates";

export const useFxStatus = (): FxStatus => {
  const [status, setStatus] = useState(getFxStatus());

  useEffect(() => {
    return subscribeFxStatus(setStatus);
  }, []);

  return status;
};
