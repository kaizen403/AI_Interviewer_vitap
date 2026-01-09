declare module 'pptx-parser' {
    interface Slide {
        texts?: string[];
    }

    interface ParsedPptx {
        slides?: Slide[];
    }

    function pptxParser(buffer: Buffer): Promise<ParsedPptx>;

    export = pptxParser;
}
