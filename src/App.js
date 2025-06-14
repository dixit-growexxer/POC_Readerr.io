import './App.css';
import Navbar from './Components/Navbar';
import Pdfreader from './Components/Pdfreader';
import React from 'react';
import PdfParent from './components/PdfParent';

function App() {
  return (
    <div>
      {/* <Navbar></Navbar> */}
      <PdfParent />
    </div>
  );
}

export default App;
