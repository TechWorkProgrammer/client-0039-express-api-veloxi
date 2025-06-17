import Variables from "@/config/Variables";
import CustomError from "@/middleware/CustomError";
import Service from "@/service/Service";

import OpenAI from "openai";

interface GenerateCodePayload {
    prompt: string;
}

class OpenAiCodeService extends Service {
    private static openai: OpenAI;

    private static getClient(): OpenAI {
        if (!this.openai) {
            this.openai = new OpenAI({
                apiKey: Variables.OPENAI_API_KEY,
            });
        }
        return this.openai;
    }

    public static async generateCode(
        payload: GenerateCodePayload,
        userId?: string
    ): Promise<Record<string, any>> {
        const openai = this.getClient();
        const systemPrompt = `
                          You are a code generator. Always respond with valid JSON only, without any comments or extra text.
                          The JSON must have exactly these top-level keys: "html", "css", "js".
                          Each key maps to an object whose keys are filenames (e.g. "index.html", "style.css", "script.js") 
                          and values are the full content of that file.
                          Example output:
                          {
                            "html": {
                              "index.html": "<!DOCTYPE html> ...",
                              "about.html": "<!DOCTYPE html> ..."
                            },
                            "css": {
                              "style.css": "body { ... }"
                            },
                            "js": {
                              "script.js": "console.log('hello');"
                            }
                          }
                          `;

        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {role: "system", content: systemPrompt},
                    {role: "user", content: payload.prompt},
                ],
                temperature: 0.5,
            });

            const raw = completion.choices[0].message?.content ?? "";
            let json: Record<string, any>;

            try {
                json = JSON.parse(raw);
            } catch (e) {
                return new CustomError("Response is not valid JSON");
            }

            await this.prisma.generatedCode.create({
                data: {
                    userId,
                    prompt: payload.prompt,
                    result: json,
                },
            });

            if (userId) {
                await this.prisma.user.update({
                    where: {id: userId},
                    data: {
                        point: {increment: 10},
                    },
                });
            }

            return json;
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || "Unknown error";
            this.handleError(new CustomError(`Failed to generate code: ${msg}`, 500));
            throw new CustomError(`Failed to generate code: ${msg}`, 500);
        }
    }
}

export default OpenAiCodeService;
