const PATH_TAG_PATTERN = /<path\s+([^>]*)\s*(?:\/>|>\s*<\/path>)/g;
const PATH_D_ATTRIBUTE_PATTERN = /^d=(["'])([\s\S]*?)\1$/;
const SVG_PATH_DATA_PATTERN = /^[MmZzLlHhVvCcSsQqTtAa0-9,.\-\s]+$/;

export const extractSvgIconPaths = (source: string): string[] => {
    const paths: string[] = [];
    const withoutPathTags = source
        .replace(PATH_TAG_PATTERN, (_, attributes: string) => {
            const normalizedAttributes = attributes.trim().replace(/\/$/, "").trim();
            const match = normalizedAttributes.match(PATH_D_ATTRIBUTE_PATTERN);
            const pathData = match?.[2];

            if (pathData && SVG_PATH_DATA_PATTERN.test(pathData)) {
                paths.push(pathData);
            }

            return "";
        })
        .trim();

    return withoutPathTags.length === 0 ? paths : [];
};
