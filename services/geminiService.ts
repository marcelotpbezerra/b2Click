import { GoogleGenAI } from "@google/genai";
import { ReportItem } from "../types";

export const generateInventoryInsights = async (reportData: ReportItem[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Chave da API ausente. Por favor, configure o ambiente para usar insights de IA.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Filter only discrepancies to save tokens and focus on what matters
    const discrepancies = reportData.filter(item => item.status !== 'MATCH');

    let summaryData = "";
    
    if (discrepancies.length === 0) {
      summaryData = "Nenhuma divergência encontrada. Todo o inventário bate com a nota fiscal.";
    } else {
      summaryData = discrepancies
        .map(item => `Produto: ${item.name} (Cód: ${item.barcode}) | Nota: ${item.invoiceQuantity} | Contado: ${item.countedQuantity} | Diferença: ${item.difference}`)
        .join('\n');
    }

    const prompt = `
      Você é um auditor de estoque experiente analisando a validação de uma nota fiscal de entrada.
      
      Contexto:
      - O usuário importou uma nota fiscal e realizou a contagem física cega (ou não).
      - Abaixo estão APENAS os itens que apresentaram divergência (FALTA ou SOBRA) ou a confirmação de que tudo está correto.

      Dados de Divergência:
      ${summaryData}

      Sua tarefa:
      1. Resuma o estado geral da validação (Quantos itens com erro vs total, se possível inferir).
      2. Analise as divergências críticas (ex: produtos de alto valor ou grandes quantidades faltando).
      3. Sugira ações (ex: recontagem, solicitação de nota de devolução, ajuste de estoque).
      
      Se não houver divergências, parabenize a equipe pela precisão.
      
      Formate a saída em Markdown. Seja direto e profissional. Responda em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Nenhum insight gerado.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Falha ao gerar insights. Verifique sua conexão ou chave da API.";
  }
};