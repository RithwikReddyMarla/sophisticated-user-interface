import os
import dotenv
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from google.generativeai import GenerativeModel, configure
from flask import Flask, request, jsonify, redirect, url_for
from werkzeug.utils import secure_filename

# Load environment variables
dotenv.load_dotenv()
configure(api_key=os.environ['GOOGLE_API_KEY'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global csv_files list
csv_files = []

# Function to load Google Gemini Model and provide queries as response
def get_gemini_response(question, prompt):
    try:
        model = GenerativeModel('gemini-pro')
        response = model.generate_content([prompt, question])
        return response.text
    except Exception as e:
        print(f"Error generating response: {e}")
        return None

# Function to retrieve and execute query from the database
def execute_sql_query(sql_query, db_name):
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        cursor.execute(sql_query)
        rows = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        conn.close()
        return rows, columns
    except sqlite3.Error as e:
        print(f"SQLite error while executing query: {e}")
        return None, None
    except Exception as e:
        print(f"Error executing query: {e}")
        return None, None

# Function to plot bar chart
def plot_bar_chart(columns, values, xlabel, ylabel):
    fig, ax = plt.subplots(1, 1, figsize=(10, 6))
    ax.bar(columns, values)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title('Bar Chart')
    ax.tick_params(axis='x', rotation=45)
    plt.tight_layout()
    fig.savefig('static/bar_chart.png')
    plt.close(fig)

# Function to plot pie chart
def plot_pie_chart(labels, sizes, title):
    fig, ax = plt.subplots(1, 1, figsize=(8, 8))
    ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140)
    ax.set_title(title)
    ax.axis('equal')
    plt.tight_layout()
    fig.savefig('static/pie_chart.png')
    plt.close(fig)

# Function to create a SQLite database from a CSV file
def create_db_from_csv(csv_file, db_name):
    try:
        df = pd.read_csv(csv_file)
        table_name = os.path.splitext(os.path.basename(csv_file))[0]
        conn = sqlite3.connect(db_name)
        df.to_sql(table_name, conn, if_exists='replace', index=False)
        conn.close()
        return table_name
    except Exception as e:
        print(f"Error creating database from CSV: {e}")
        return None

# Function to get table names from the database
def get_table_names(db):
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cur.fetchall()
        conn.close()
        return [table[0] for table in tables]
    except Exception as e:
        print(f"Error fetching table names: {e}")
        return []

# Function to get column names for a specific table
def get_column_names(db, table_name):
    try:
        conn = sqlite3.connect(db)
        cur = conn.cursor()
        cur.execute(f"PRAGMA table_info({table_name});")
        columns = cur.fetchall()
        conn.close()
        return [column[1] for column in columns]
    except Exception as e:
        print(f"Error fetching column names: {e}")
        return []

# Define Prompts
custom_prompt_template = """
You are an expert in converting English text to SQL query.
I have a database with table named {table_name} & have columns {columns}. 
Please help me with this task. Provide only the SQL query without any additional text or formatting.
"""

db_name = "dataset.db"

# Function to create databases from CSV files and get the table names
def initialize_db(csv_files, db_name):
    table_names = []
    for csv_file in csv_files:
        table_name = create_db_from_csv(csv_file, db_name)
        if table_name:
            table_names.append(table_name)
    return table_names

@app.route('/llm', methods=['GET'])
def index():
    tables = get_table_names(db_name)
    return jsonify(tables)

@app.route('/llm/get_columns', methods=['POST'])
def get_columns():
    table_name = request.json.get('table')
    columns = get_column_names(db_name, table_name)
    return jsonify(columns)

@app.route('/llm/generate_query', methods=['POST'])
def generate_query():
    table_name = request.json.get('table')
    question = request.json.get('question')
    columns = get_column_names(db_name, table_name)
    columns_str = ", ".join(columns)
    custom_prompt = custom_prompt_template.format(table_name=table_name, columns=columns_str)
    response = get_gemini_response(question, custom_prompt)
    
    if response:
        sql_query = response.strip().replace('```', '').strip()
        if sql_query.lower().startswith('sql'):
            sql_query = sql_query[3:].strip()
        
        result, result_columns = execute_sql_query(sql_query, db_name)
        if result and result_columns:
            return jsonify({
                'query': sql_query,
                'columns': result_columns,
                'rows': result
            })
        else:
            return jsonify({'error': 'Failed to execute query or no results found.'})
    else:
        return jsonify({'error': 'Failed to generate a response for the query.'})

@app.route('/llm/generate_graph', methods=['POST'])
def generate_graph():
    data = request.get_json()
    result_columns = data['columns']
    result = data['rows']
    graph_type = data['graph_type']
    
    if graph_type in ['bar', 'pie', 'both'] and len(result_columns) >= 2:
        xlabel = result_columns[0]
        ylabel = result_columns[1]
        x_values = [str(row[0]) for row in result]
        y_values = [row[1] for row in result]
        
        if graph_type == 'bar':
            plot_bar_chart(x_values, y_values, xlabel, ylabel)
            return jsonify({'graph': 'bar_chart.png'})
        elif graph_type == 'pie':
            plot_pie_chart(x_values, y_values, f'{xlabel} vs {ylabel}')
            return jsonify({'graph': 'pie_chart.png'})
        elif graph_type == 'both':
            plot_bar_chart(x_values, y_values, xlabel, ylabel)
            plot_pie_chart(x_values, y_values, f'{xlabel} vs {ylabel}')
            return jsonify({'graph': 'both'})
    else:
        return jsonify({'error': 'Invalid graph type or insufficient data for plotting.'})

@app.route('/llm/upload_dataset', methods=['POST'])
def upload_dataset():
    global csv_files
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request.'})
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file.'})
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Clear existing tables and data
    conn = sqlite3.connect(db_name)
    cur = conn.cursor()
    table_names = get_table_names(db_name)
    for table_name in table_names:
        cur.execute(f"DROP TABLE IF EXISTS {table_name}")
    conn.commit()
    conn.close()

    # Check if the uploaded file is `housing.csv` or use the default `housing.csv` if no file is uploaded
    if filename == 'housing.csv':
        csv_files = [file_path]
    else:
        # Include `housing.csv` along with the uploaded file
        default_file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'housing.csv')
        if not os.path.isfile(default_file_path):
            # Place a default `housing.csv` file if it doesn't exist
            raise FileNotFoundError('Default housing.csv file is missing.')
        csv_files = [default_file_path, file_path]

    # Initialize the database with the files
    initialize_db(csv_files, db_name)
    
    table_name = os.path.splitext(filename)[0]
    return jsonify({'success': f'Dataset {filename} uploaded and table {table_name} created.'})

@app.route('/llm/get_datasets', methods=['GET'])
def get_datasets():
    datasets = [os.path.basename(file) for file in os.listdir(app.config['UPLOAD_FOLDER'])]
    return jsonify(datasets)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
    
