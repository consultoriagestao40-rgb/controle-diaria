import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined) {
  const num = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

export function handleOpenAnexo(anexo: { url: string; nomeOriginal: string; tipo?: string }) {
  const url = anexo.url
  if (!url) return

  if (url.startsWith("data:")) {
    const newWindow = window.open()
    if (!newWindow) {
      alert("Por favor, permita popups para este site para visualizar o comprovante.")
      return
    }

    newWindow.document.title = anexo.nomeOriginal

    const isPdf = anexo.tipo === "application/pdf" || url.includes("data:application/pdf")

    if (isPdf) {
      newWindow.document.write(
        `<html>
          <head>
            <title>${anexo.nomeOriginal}</title>
            <style>body{margin:0;padding:0;background:#525659;height:100vh;width:100vw;}iframe{border:none;width:100%;height:100%;}</style>
          </head>
          <body>
            <iframe src="${url}"></iframe>
          </body>
        </html>`
      )
    } else {
      newWindow.document.write(
        `<html>
          <head>
            <title>${anexo.nomeOriginal}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background: #0f172a;
                min-height: 100vh;
                box-sizing: border-box;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                max-width: 90%;
              }
              img {
                max-width: 100%;
                max-height: 80vh;
                object-fit: contain;
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                background: white;
                padding: 10px;
              }
              .btn {
                background: #6366f1;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                text-decoration: none;
                transition: background 0.2s;
                font-size: 14px;
              }
              .btn:hover {
                background: #4f46e5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${url}" alt="${anexo.nomeOriginal}" />
              <a href="${url}" download="${anexo.nomeOriginal}" class="btn">Baixar Comprovante</a>
            </div>
          </body>
        </html>`
      )
    }
    newWindow.document.close()
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

