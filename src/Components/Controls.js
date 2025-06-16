import React from 'react'
import controlstyles from '../Css/Controls.module.css';

function Controls(props) {

    const { numPages, pageNumber, setPageNumber, fileName, setRotatedoc, rotatedoc } = props;


    // Use booleans for disabled state
    const isFirstPage = pageNumber <= 1;
    const isLastPage = pageNumber === numPages;


    const nextpage = () => {
        if (numPages !== pageNumber) setPageNumber(pageNumber + 1);
    }
    const previouspage = () => {
        setPageNumber(pageNumber - 1);
    }
    const firstpage = () => {
        setPageNumber(1);
    }
    const lastpage = () => {
        if (numPages !== pageNumber) setPageNumber(numPages);
    }

    const handleRotate = () => {
        if (rotatedoc === 360) {
            setRotatedoc(0);
        }
        else {
            setRotatedoc(rotatedoc + 90);
        }
    }

    const handlePageno = (e) => {
        setPageNumber(Number(e.target.value));
    }


    return (
        <div style={{ display: "flex", flexWrap: "wrap", width: "100%", background: "#461d3c", height: "65px", color: "white", alignItems: "center", justifyContent: "space-between" }} className="row">

            <h6 className={controlstyles.file_name}>{fileName}</h6>
            <div className={controlstyles.page_controls}>
                <button
                  className={controlstyles.pdf_nav_btn}
                  onClick={firstpage}
                  disabled={isFirstPage}
                  title="First Page"
                >
                  <i className="fa fa-angle-double-left" aria-hidden="true"></i>
                </button>
                <button
                  className={controlstyles.pdf_nav_btn}
                  onClick={previouspage}
                  disabled={isFirstPage}
                  title="Previous Page"
                >
                  <i className="fa fa-angle-left" aria-hidden="true"></i>
                </button>
                <input
                  type="number"
                  style={{ width: "30px", height: "24px", color: "white", background: "#331427", margin: "0", border: "none", textAlign: "center", borderRadius: "4px" }}
                  value={pageNumber}
                  min={1}
                  max={numPages}
                  onChange={handlePageno}
                />
                <h6 style={{ margin: '0 8px', fontWeight: 500 }}>/ {numPages}</h6>
                <button
                  className={controlstyles.pdf_nav_btn}
                  onClick={nextpage}
                  disabled={isLastPage}
                  title="Next Page"
                >
                  <i className="fa fa-angle-right" aria-hidden="true"></i>
                </button>
                <button
                  className={controlstyles.pdf_nav_btn}
                  onClick={lastpage}
                  disabled={isLastPage}
                  title="Last Page"
                >
                  <i className="fa fa-angle-double-right" aria-hidden="true"></i>
                </button>
            </div>

            <div className={controlstyles.tools}>
                <button className={`btn waves-effect waves-light pink darken-4 `} onClick={handleRotate}  ><i className="fa fa-repeat" aria-hidden="true"></i> Rotate Doc</button>
            </div>

        </div>
    )
}

export default Controls
