export const useFilePicker = (
    accept: string = "",
    multiple: boolean = false
): Promise<FileList | null> => {
    return new Promise((resolve) => {
        const fileInput = Object.assign(
            document.createElement("input"),
            { type: "file", accept, multiple }
        );
        let resolved = false;

        const resolver = (files: FileList | null) => {
            if (resolved) return;
            resolved = true;
            window.removeEventListener("focus", focusHandler);
            resolve(files);
        };

        fileInput.onchange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            resolver(target.files && target.files.length > 0 ? target.files : null);
        };

        const focusHandler = () => setTimeout(() => resolver(null), 300);
        window.addEventListener("focus", focusHandler, { once: true });

        fileInput.click();
    });
};
