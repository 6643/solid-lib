import { createSignal, type Accessor } from "solid-js";


export const useCopy = (): [
    accessor: Accessor<boolean>,
    copyFn: (data: string | Blob) => Promise<void>,
] => {
    const [copied, setCopied] = createSignal(false);

    const copy = async (data: string | Blob) => {
        if (!navigator.clipboard) {
            console.warn("Clipboard API not available");
            return;
        }
        try {
            if (typeof data === "string") {
                await navigator.clipboard.writeText(data);
            } else {
                if (typeof ClipboardItem === "undefined" || !navigator.clipboard.write) {
                    const error =
                        "Copying files/images to the clipboard is not supported in this browser.";
                    console.error(error);
                    return;
                }
                const item = new ClipboardItem({ [data.type]: data });
                await navigator.clipboard.write([item]);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            setCopied(false);
        }
    };

    return [copied, copy];
};
