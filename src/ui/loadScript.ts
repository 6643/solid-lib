import { createEffect, onCleanup, createSignal, type Accessor } from "solid-js";

type ScriptStatus = 'idle' | 'loading' | 'loaded' | 'error';

export const loadScript = (src: Accessor<string | null> | string | null): Accessor<ScriptStatus> => {
    const [status, setStatus] = createSignal<ScriptStatus>('idle');
    const scriptSrc = typeof src === 'function' ? src : () => src;

    createEffect(
        () => scriptSrc(),  // compute
        (currentSrc) => {  // apply
            if (!currentSrc) {
                setStatus('idle');
                return;
            }

            // 检查脚本是否已存在
            let script = document.querySelector(`script[src="${currentSrc}"]`) as HTMLScriptElement;

            if (!script) {
                // 创建脚本标签
                script = document.createElement('script');
                script.src = currentSrc;
                script.async = true;
                script.setAttribute('data-status', 'loading'); // 自定义属性，方便查询
                document.head.appendChild(script);
                setStatus('loading');
            } else {
                // 如果脚本已存在，检查其状态
                const existingStatus = script.getAttribute('data-status') as ScriptStatus;
                if (existingStatus) {
                    setStatus(existingStatus);
                }
            }

            const handleLoad = () => {
                script.setAttribute('data-status', 'loaded');
                setStatus('loaded');
            };

            const handleError = () => {
                script.setAttribute('data-status', 'error');
                setStatus('error');
            };

            script.addEventListener('load', handleLoad);
            script.addEventListener('error', handleError);

            onCleanup(() => {
                script.removeEventListener('load', handleLoad);
                script.removeEventListener('error', handleError);
                // 动态加载脚本的清理策略通常比较复杂，取决于具体需求。
                // 简单起见，这里不自动移除，避免副作用。
            });
        }
    );

    return status;
};
