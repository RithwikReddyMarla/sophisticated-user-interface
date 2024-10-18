import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';
import { IoMdHome } from "react-icons/io";

function Homepage() {
  return (
    <div className="homepage">
      <div className="header">
        <div className="leftsection">
          <div className="vizq">
            <h2>VizQ</h2>
          </div>
          <div className="home">
            <h2>
              <IoMdHome className="homeimg" style={{ color: '#333' }} /> Home
            </h2>
          </div>
        </div>
        <div className="rightsection">
          <Link to="/about" className="about" style={{color:'#333'}}>About</Link>
          <Link to="/help" className="help" style={{color:'#333'}}>Help?</Link>
        </div>
      </div>
      <div className="wel">
        <div className="welcometitle">
          Welcome to VizQ AI..
        </div>
        <div className="content">
          <p>This chatbot is designed to convert English instructions</p>
          <p>into PySpark or SQL code, execute the queries,</p>
          <p>and display visual representations of the data.</p>
          <Link to="/index" className="get-started-btn">
            <button className="btn">Get Started</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Homepage;