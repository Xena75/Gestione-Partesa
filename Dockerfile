# Dockerfile per bore server
FROM ubuntu:22.04

# Aggiorna il sistema e installa le dipendenze necessarie
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Crea directory di lavoro
WORKDIR /app

# Scarica bore per Linux
RUN wget -O bore.tar.gz https://github.com/ekzhang/bore/releases/download/v0.6.0/bore-v0.6.0-x86_64-unknown-linux-musl.tar.gz

# Estrai bore
RUN tar -xzf bore.tar.gz && \
    chmod +x bore && \
    mv bore /usr/local/bin/ && \
    rm bore.tar.gz

# Esponi la porta 7835 (porta di default di bore)
EXPOSE 7835

# Comando di default per avviare il server bore
CMD ["bore", "server", "--bind-addr", "0.0.0.0", "--min-port", "1024", "--max-port", "65535"]