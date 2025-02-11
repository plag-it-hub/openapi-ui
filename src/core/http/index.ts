import { notification } from "antd";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { filter, findIndex, keys, map, pickBy, values } from "lodash-es";
import { MethodType } from "../../openapi/type";
import { IConfigInfoStorageState, configInfoStorageKey, defaultConfigInfoStorage } from "../store";

export function getConfigInfo() {
  const configInfoStorageStr = globalThis.sessionStorage.getItem(configInfoStorageKey);
  const configInfoStorage = configInfoStorageStr
    ? (JSON.parse(configInfoStorageStr) as IConfigInfoStorageState)
    : defaultConfigInfoStorage;

  return configInfoStorage.state.configInfo;
}

export const defaultTimeout = 120;

export function request(axiosConfig: AxiosRequestConfig) {
  let timeout = defaultTimeout * 1000; // default request timeout is 120000 millisecond
  const configInfo = getConfigInfo();

  if (configInfo) {
    timeout = configInfo.timeout * 1000;
  }

  axiosConfig = {
    method: MethodType.get,
    timeout: timeout,
    headers: {
      "Content-Type": "application/json",
    },
    ...axiosConfig,
  };
  console.log("axiosConfig", axiosConfig);

  if (axiosConfig.method === MethodType.get && ~findIndex(values(axiosConfig.params), (item) => Array.isArray(item))) {
    axiosConfig.paramsSerializer = (params) => {
      return filter(
        map(keys(pickBy(params, (value) => !!value)), (key) => {
          const value = params[key];

          if (Array.isArray(value)) {
            const newArr = map(
              filter(value, (item) => !!item),
              (val) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`,
            );

            return newArr.join("&");
          } else {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          }
        }),
        (item) => !!item,
      ).join("&");
    };
  }

  return axios(axiosConfig).catch((reason) => {
    const resData = reason?.response?.data;
    notification.error({
      message:
        resData?.message ||
        resData?.msg ||
        resData ||
        reason?.response?.statusText ||
        reason?.message ||
        "api request is error, please check",
      duration: 2,
    });

    return reason.response as AxiosResponse;
  });
}
