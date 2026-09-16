import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 跳过全局错误提示，由调用方自行处理 */
    skipErrorHandler?: boolean
    /** 静默请求：不触发全局 loading */
    silent?: boolean
    /** 跳过注入鉴权头 */
    skipAuth?: boolean
    /** 返回完整 AxiosResponse，而不是解包后的 data */
    rawResponse?: boolean
    /** 内部使用：标记已重试，防止拦截器死循环 */
    _retry?: boolean
  }
}
