declare module "pdf-parse/lib/pdf-parse.js" {
	export interface PageData {
		[key: string]: unknown;
	}

	export interface Options {
		max?: number;
		normalizeWhitespace?: boolean;
		disableCombineTextItems?: boolean;
		pagerender?: (pageData: PageData) => Promise<string>;
	}

	export interface PdfInfo {
		[key: string]: unknown;
	}

	export interface Result {
		numpages: number;
		numrender: number;
		info: PdfInfo;
		metadata: PdfInfo;
		version: string;
		text: string;
	}

	function pdfParse(dataBuffer: Buffer, options?: Options): Promise<Result>;

	export = pdfParse;
}
