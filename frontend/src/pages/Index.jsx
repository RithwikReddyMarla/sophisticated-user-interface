import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import '../App.css';

const Index = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [columns, setColumns] = useState([]);
    const [question, setQuestion] = useState('');
    const [queryResult, setQueryResult] = useState(null);
    const [graphData, setGraphData] = useState(null);
    const [graphType, setGraphType] = useState('bar');
    const [userChoice, setUserChoice] = useState(null);
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');

    // Fetch tables when user chooses to show tables
    useEffect(() => {
        if (userChoice === 'show_tables') {
            axios.get('http://localhost:3000/tables')
                .then(response => {
                    setTables(response.data);
                })
                .catch(error => {
                    console.error('There was an error fetching the tables!', error);
                });
        }
    }, [userChoice]);

    // Fetch columns when a table is selected
    useEffect(() => {
        if (selectedTable) {
            axios.post('http://localhost:3000/get_columns', { table: selectedTable })
                .then(response => {
                    setColumns(response.data);
                })
                .catch(error => {
                    console.error('There was an error fetching the columns!', error);
                });
        } else {
            setColumns([]); // Reset columns if no table is selected
        }
    }, [selectedTable]);

    // Handle user choice for showing tables or uploading dataset
    const handleChoice = (choice) => {
        setUserChoice(choice);
        if (choice === 'show_tables') {
            axios.get('http://localhost:3000/tables')
                .then(response => {
                    setTables(response.data);
                })
                .catch(error => {
                    console.error('There was an error fetching the tables!', error);
                });
        }
    };

    // Handle file selection
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };


    const handleUpload = () => {
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
    
            axios.post('http://localhost:3000/upload_dataset', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(response => {
                setUploadStatus(response.data.message || response.data.error);
                if (response.data.message) {
                    // Update state to redirect to the query page
                    setUserChoice('show_tables');
                    setSelectedTable('');
                    setColumns([]);
                    setQuestion('');
                    setQueryResult(null);
                    setGraphData(null);
    
                    // Fetch tables after successful upload
                    axios.get('http://localhost:3000/tables')
                        .then(response => {
                            setTables(response.data);
                        })
                        .catch(error => {
                            console.error('There was an error fetching the tables!', error);
                        });
                }
            })
            .then(()=>{
                setUserChoice("show_tables");
            })
            .catch(error => {
                console.error('There was an error uploading the dataset!', error);
                setUploadStatus('Failed to upload dataset.');
            });
        }
    };
    

    // Generate SQL query based on table and question
    const generateQuery = async () => {
        try {
            const response = await axios.post('http://localhost:3000/generate_query', {
                table: selectedTable,
                question: question
            });

            const data = response.data;
            if (data.error) {
                setQueryResult({ error: data.error });
                return;
            }

            setQueryResult(data);
            setGraphData(null); // Reset graph data when a new query is generated
        } catch (error) {
            console.error('There was an error generating the query!', error);
            setQueryResult({ error: 'Failed to generate query.' });
        }
    };
    // Generate graph based on query result
const generateGraph = () => {
    if (!queryResult || !queryResult.rows || !queryResult.columns) return;

    if (queryResult.columns.length < 2 ) {
        setGraphData(null);
        alert('Insufficient data to plot a graph. Please ensure your query result has at least two columns.');
        return;
    }

    const labels = queryResult.rows.map(row => row[0]); // Assuming the first column is the label
    const dataValues = queryResult.rows.map(row => row[1]); // Assuming the second column is the value

    const backgroundColors = labels.map((_, index) => {
        const colors = [
            'rgba(255, 99, 132, 0.6)',
            'rgba(50, 122, 275, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(95, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(250, 159, 64, 0.6)',
            'rgba(199, 199, 199, 0.6)'
        ];
        return colors[index % colors.length]; // Cycle through the colors if there are more labels than colors
    });

    const data = {
        labels: labels,
        datasets: [{
            label: selectedTable,
            data: dataValues,
            backgroundColor: graphType === 'pie' ? backgroundColors : 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    };

    setGraphData(data);
};


    return (
        <div className="container">
            <div className="left-pane">
                <h1>VIZ-Q</h1>
                {userChoice === null && (
                    <div className="user-choice">
                        <h2>Do you have any datasets?</h2>
                        <button onClick={() => handleChoice('upload')}>Yes</button>
                        <button onClick={() => handleChoice('show_tables')}>No</button>
                    </div>
                )}
                {userChoice === 'upload' && (
                    <div>
                        <h2>Please upload your dataset:</h2>
                        <input type="file" accept=".csv" onChange={handleFileChange} />
                        <button type="button" className="generate-btn" onClick={handleUpload}>Upload Dataset</button>
                        {uploadStatus && <p>{uploadStatus}</p>}
                    </div>
                )}
                {userChoice === 'show_tables' && (
                    <>
                        <form onSubmit={(e) => { e.preventDefault(); generateQuery(); }}>
                            <label htmlFor="table">Select Table:</label>
                            <select
                                id="table"
                                name="table"
                                value={selectedTable}
                                onChange={(e) => setSelectedTable(e.target.value)}
                            >
                                <option value="" disabled>Select a table</option>
                                {tables.map(table => (
                                    <option key={table} value={table}>{table}</option>
                                ))}
                            </select>
                            <br />
                            {selectedTable && columns.length > 0 && (
                                <>
                                    <label htmlFor="columns">Columns:</label>
                                    <ul id="columns-list">
                                        {columns.map(column => (
                                            <li key={column}>{column}</li>
                                        ))}
                                    </ul>
                                    <br />
                                </>
                            )}
                        </form>
                    </>
                )}
            </div>
            {userChoice === 'show_tables' && (
                <div className="question-container">
                    <div className="question-box">
                        <label htmlFor="question">Enter your question:</label>
                        <textarea
                            id="question"
                            name="question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            rows="3"
                        />
                        <br />
                        <button type="button" className="generate-btn" onClick={generateQuery}>Generate Query</button>
                    </div>
                    {queryResult && queryResult.error && <p style={{ color: 'red' }}>{queryResult.error}</p>}
                    {queryResult && !queryResult.error && (
                        <>
                            <h2>Generated SQL Query:</h2>
                            <p>{queryResult.query}</p>
                            <h2>Query Result:</h2>
                            <table className="query-result-table">
                                <thead>
                                    <tr>
                                        {queryResult.columns.map(col => (
                                            <th key={col}>{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {queryResult.rows.map((row, index) => (
                                        <tr key={index}>
                                            {row.map((val, i) => (
                                                <td key={i}>{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <br />
                            <label htmlFor="graph-type" className="graph-type-label">Select Graph Type:</label>
                            <select
                                id="graph-type"
                                value={graphType}
                                onChange={(e) => setGraphType(e.target.value)}
                            >
                                <option value="bar">Bar</option>
                                <option value="pie">Pie</option>
                            </select>
                            <br />
                            <button type="button" className="generate-btn" onClick={generateGraph}>Generate Graph</button>
                        </>
                    )}
                    {graphData && (
                        <div className="graph-container">
                            <h2>{graphType.charAt(0).toUpperCase() + graphType.slice(1)} Chart:</h2>
                            {graphType === 'bar' ? (
                                <Bar data={graphData} />
                            ) : (
                                <Pie data={graphData} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Index;
