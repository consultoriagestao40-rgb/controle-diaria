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
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
              body {
                margin: 0;
                padding: 0;
                background: #525659;
                height: 100vh;
                width: 100vw;
                overflow: hidden;
                font-family: system-ui, -apple-system, sans-serif;
              }
              .top-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: #0f172a;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                z-index: 100;
              }
              .btn {
                background: rgba(255,255,255,0.15);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                font-size: 13px;
                text-decoration: none;
                transition: all 0.2s;
                font-family: inherit;
              }
              .btn:hover {
                background: rgba(255,255,255,0.25);
              }
              .btn-primary {
                background: #6366f1;
              }
              .btn-primary:hover {
                background: #4f46e5;
              }
              .file-name {
                color: white;
                font-size: 13px;
                font-weight: 600;
                max-width: 40%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              iframe {
                border: none;
                width: 100%;
                height: calc(100vh - 60px);
                margin-top: 60px;
              }
            </style>
          </head>
          <body>
            <div class="top-bar">
              <button onclick="goBack()" class="btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Voltar
              </button>
              <span class="file-name">${anexo.nomeOriginal}</span>
              <a href="${url}" download="${anexo.nomeOriginal}" class="btn btn-primary">Baixar</a>
            </div>
            <iframe src="${url}"></iframe>
            <script>
              function goBack() {
                window.close();
                setTimeout(function() {
                  window.history.back();
                }, 100);
              }
            </script>
          </body>
        </html>`
      )
    } else {
      newWindow.document.write(
        `<html>
          <head>
            <title>${anexo.nomeOriginal}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body {
                margin: 0;
                padding: 0;
                background: #0f172a;
                min-height: 100vh;
                width: 100vw;
                font-family: system-ui, -apple-system, sans-serif;
                box-sizing: border-box;
              }
              .top-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                box-sizing: border-box;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                z-index: 100;
              }
              .btn {
                background: rgba(255,255,255,0.15);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                font-size: 13px;
                text-decoration: none;
                transition: all 0.2s;
                font-family: inherit;
              }
              .btn:hover {
                background: rgba(255,255,255,0.25);
              }
              .btn-primary {
                background: #6366f1;
              }
              .btn-primary:hover {
                background: #4f46e5;
              }
              .file-name {
                color: white;
                font-size: 13px;
                font-weight: 600;
                max-width: 40%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .container {
                padding: 80px 20px 40px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: calc(100vh - 120px);
                box-sizing: border-box;
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
            </style>
          </head>
          <body>
            <div class="top-bar">
              <button onclick="goBack()" class="btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><polyline points="15 18 9 12 15 6"></polyline></svg>
                Voltar
              </button>
              <span class="file-name">${anexo.nomeOriginal}</span>
              <a href="${url}" download="${anexo.nomeOriginal}" class="btn btn-primary">Baixar</a>
            </div>
            <div class="container">
              <img src="${url}" alt="${anexo.nomeOriginal}" />
            </div>
            <script>
              function goBack() {
                window.close();
                setTimeout(function() {
                  window.history.back();
                }, 100);
              }
            </script>
          </body>
        </html>`
      )
    }
    newWindow.document.close()
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

