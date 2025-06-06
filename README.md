# Chatbot pour plateforme de support de tickets

## Introduction

Cet outil sert d'assistant informatique pour une plateforme de tickets.

Une base de donnée de tickets est requise. A chaque requête, l'IA va se charger de trouver les 3 tickets les plus pertinents associés à ladite requête et les fournir en RAG au LLM. La réponse sera streamée directement sur le site web à l'utilisateur.

Le projet est divisé en deux parties : le front-end, réalisé via NextJS + Vite, et le back-end, une API Flask utilisant le moteur de recherche Faiss + un modèle d'embedding pour le RAG et un LLM avec lequel nous communiquerons via Llama. Nous utiliserons ici Mistral 7B optimisé pour CPUs.

L'application Web est pour l'instant mono-utilisateur, et les réponses peuvent être imparfaites en fonction du LLM et/ou de la taille de la base de données de tickets.

La création de l'index FAISS à partir de la base de données de tickets ne sera pas traité.

## Prérequis

Cloner le git et se déplacer dedans :
```bash
git clone git@github.com:Asumamusa/chatbot_tickets.git && cd chatbot_tickets
```

### Installer Llama et Mistral 7B
1. Cloner le dépôt llama.cpp

```bash
git clone https://github.com/ggerganov/llama.cpp.git
```

2. Compiler llama.cpp

```bash
cd llama.cpp && make
```

3. Télécharger le modèle Mistral 7B

```bash
mkdir -p models/mistral

# Modèle quantifié léger utilisé ici
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/mistral-7b-instruct-v0.1.Q4_K_M.gguf \
     -O models/mistral/mistral-7b-instruct-v0.1.Q4_K_M.gguf
    
```

4. Tester l'installation

```bash
./build/bin/llama-cli -m models/mistral/mistral-7b-instruct-v0.1.Q4_K_M.gguf -p "Bonjour" -n 20
```

### Installer un gestionnaire de paquets

Nous utiliserons ici npm avec nodejs, vous pourrez trouver comment l'installer sur leur site web : https://nodejs.org/en/download

## Mise en place de l'application

Nous vous recommandons d'utiliser un gestionnaire de processus ou un multiplexeur de terminal pour gérer le back-end et le front-end sur un même serveur.

Nous vous montrons également comment mettre en place le serveur uniquement **en mode développement**.

### Front-end

1. Aller dans le dossier correspondant :

```bash
cd chatbot_front
```

2. Installer les dépendances nodejs :

```bash
npm ci
```

3. Lancer le serveur web :

```bash 
npm run dev

# Ou pour lancer en network local :
npm run dev -- --host
```

### Back-end

1. Aller dans le dossier correspondant :

```bash
cd chatbot_back
```

2. Modifier le fichier backend.py pour y indiquer où trouver les ressources. Vous devez posséder :

    - Un fichier .txt contenant tous les tickets de la base de données.
    - Un index FAISS tiré dudit fichier .txt.

    En outre, vous pouvez également personnaliser le modèle d'embedding et le prompt de contexte.

3. Créer un environnement virtuel python :

```bash
python3 -m venv venv
```

4. L'activer :

```bash
source venv/bin/activate
```

5. Installer les dépendances python :

```bash
pip3 install -r requirements.txt
```

6. Lancer le back-end :
```bash
python3 backend.py
```

## Crédits

Développé par Emilien Fourgnier, Nicolas Szpakowski, Kenan Tunc dans le cadre du projet Cassiopée 2025 de Télécom SudParis.