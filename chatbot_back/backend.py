from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import subprocess
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import time, sys, os, fcntl, codecs
import json
import re

# Nom du fichier faiss_index
FAISS_INDEX_FILE = "fichier.index"
# Nom du fichier contenant les documents
TICKETS_FILE = "fichier.txt"
# Nom du modèle d'embedding
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Template de prompt pour l'IA
PROMPT_TEMPLATE = """[INST] 
(Votre contexte, par exemple "tu es un expert en informatique et en réseaux", etc.)

Contexte:
{context}

Question: {question}
Réponse:[/INST]"""

app = Flask(__name__)
CORS(app)

# Variables globales (ne pas toucher)
index = None
documents = None
model = None

def initialize_chatbot():
    """Initialise le chatbot une seule fois au démarrage"""
    global index, documents, model
    try :
        print("Initialisation du chatbot...")
        
        print("Chargement de l'index FAISS...")
        index = faiss.read_index(FAISS_INDEX_FILE)
        print("Index FAISS chargé.")
        
        print("Chargement des documents...")
        with open(TICKETS_FILE, "r") as fichier:
            documents = fichier.read().split("\n-----\n")
        print(f"{len(documents)} documents chargés.")
        
        print("Chargement du modèle d'embedding...")
        model = SentenceTransformer(MODEL_NAME)
        print("Modèle d'embedding chargé.")
    except FileNotFoundError as e:
        print(f"Erreur de chargement des documents: {e}")
        raise
    except Exception as e:
        print(f"Erreur lors de l'initialisation du chatbot: {e}")
        raise

def clean_response_text(text):
    end_markers = [
        "[end of text]", 
        "<|im_end|>", 
        "</s>", 
        "[INST]", 
        "<<SYS>>",
        "<|endoftext|>",
        "[/INST]"
    ]
    
    cleaned = text
    for marker in end_markers:
        cleaned = cleaned.replace(marker, "")
    
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = cleaned.strip()
    
    return cleaned

def generate_response_streaming(prompt):
    process = subprocess.Popen([
        "llama.cpp/build/bin/llama-cli",
        "-m", "llama.cpp/models/mistral/mistral-7b-instruct-v0.1.Q4_K_M.gguf",
        "-p", prompt,
        "-n", "800",
        "--temp", "0.3",
        "-t", "14",
        "-c", "2048",
        "-b", "512",
        "--no-warmup"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)

    fd = process.stdout.fileno()
    fl = fcntl.fcntl(fd, fcntl.F_GETFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)

    decoder = codecs.getincrementaldecoder("utf-8")()
    buffer = ""
    streaming_started = False
    char_count = 0
    complete_response = ""
    
    response_buffer = ""
    
    try:
        while True:
            try:
                read_size = 1 if streaming_started else 512
                chunk = process.stdout.read(read_size)
                
                if chunk:
                    decoded = decoder.decode(chunk)
                    buffer += decoded
                    complete_response += decoded
                    
                    if not streaming_started:
                        if "[/INST]" in buffer:
                            parts = buffer.split("[/INST]", 1)
                            if len(parts) > 1:
                                response_part = parts[1]
                                
                                for char in response_part:
                                    response_buffer += char
                                    
                                    if any(response_buffer.endswith(marker[:len(response_buffer.split()[-1]) if response_buffer.split() else 0]) 
                                          for marker in ["[end", "<|im_end", "</s>", "[INST]", "<<SYS", "<|endoftext"]):
                                        continue
                                    
                                    if any(marker in response_buffer for marker in ["[end of text]", "<|im_end|>", "</s>", "[INST]", "<<SYS>>", "<|endoftext|>"]):
                                        cleaned_response = clean_response_text(response_buffer)
                                        return
                                    
                                    char_count += 1
                                    
                                    yield char
                                
                                streaming_started = True
                                buffer = ""
                    else:
                        for char in decoded:
                            response_buffer += char
                            
                            if any(marker in response_buffer for marker in ["[end of text]", "<|im_end|>", "</s>", "[INST]", "<<SYS>>", "<|endoftext|>"]):
                                cleaned_response = clean_response_text(response_buffer)
                                return
                            
                            char_count += 1
                            
                            yield char
                        
                elif process.poll() is not None:
                    remaining = decoder.decode(b'', final=True)
                    if remaining and streaming_started:
                        for char in remaining:
                            response_buffer += char
                            char_count += 1
                            yield char
                    
                    cleaned_response = clean_response_text(response_buffer)
                    break
                else:
                    time.sleep(0.001 if streaming_started else 0.01)

            except Exception as e:
                time.sleep(0.001 if streaming_started else 0.01)

    except Exception as e:
        yield f"\n[Erreur: {str(e)}]"

def process_question_streaming(question):
    global index, documents, model
    
    question_embedding = model.encode([question], convert_to_numpy=True)
    threshold = 0.7 
    D, I = index.search(question_embedding,10)
    contexts = [(D[0][x], I[0][x]) for x in range(len(D[0])) if D[0][x] < threshold][5:]
    contexts_id = [c[1] for c in sorted(contexts)]
    valid_contexts = [documents[i] for i in contexts_id]
    
    if not valid_contexts:
        yield "Désolé, je ne peux pas répondre à cette question avec les informations dont je dispose."
        return
    
    avg_similarity = np.mean([1 - score for score in D[0] if score < threshold])
    confidence = 1 - max(0.1, min(0.99, avg_similarity))
    
    context_parts = []
    total_length = 0
    max_context_length = 600
    
    for ctx in valid_contexts:
        if total_length + len(ctx) > max_context_length:
            remaining_space = max_context_length - total_length
            if remaining_space > 100:
                context_parts.append(ctx[:remaining_space] + "...")
            break
        else:
            context_parts.append(ctx)
            total_length += len(ctx)
    
    context = "\n---\n".join(context_parts)
    
    prompt = PROMPT_TEMPLATE.format(
        context=context,
        question=question
    )
    
    for char in generate_response_streaming(prompt):
        yield char
    
    metadata = {
        "type": "metadata",
        "confidence": float(round(confidence, 2))
    }
    
    yield f"\n__METADATA__{json.dumps(metadata)}__END__"

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({"error": "Message manquant"}), 400
        
        message = data['message'].strip()
        
        if not message:
            return jsonify({"error": "Message vide"}), 400
        
        def generate():
            for char in process_question_streaming(message):
                yield char
        
        return Response(
            generate(),
            mimetype='text/plain',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        )
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "chatbot_ready": all([index is not None, documents is not None, model is not None])
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "API Chatbot Mistral",
        "endpoints": {
            "chat": "/api/chat (POST)",
            "health": "/api/health (GET)"
        }
    })

if __name__ == '__main__':
    print("--- Démarrage de l'API Flask ---")
    
    try:
        initialize_chatbot()
    except Exception as e:
        print(f"Erreur lors de l'initialisation: {e}")
        sys.exit(1)
    
    print("--- API Flask prête ---")
    app.run(host='0.0.0.0', port=8000, debug=False)