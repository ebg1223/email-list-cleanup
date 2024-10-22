import { createSignal } from "solid-js";
import Papa from "papaparse";

function CSVParser() {
  const [csvData, setCsvData] = createSignal(null);
  const [error, setError] = createSignal(null);
  const [invalidEmails, setInvalidEmails] = createSignal([]);
  const [duplicateRows, setDuplicateRows] = createSignal([]);
  const [filteredData, setFilteredData] = createSignal([]);
  const [originalFileName, setOriginalFileName] = createSignal("filtered_data");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOriginalFileName(file.name.replace(/\.csv$/, ""));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(results.errors);
          setCsvData(null);
          setInvalidEmails([]);
          setDuplicateRows([]);
          setFilteredData([]);
        } else {
          const data = results.data;
          if (data.length > 0 && Object.keys(data[0]).length === 3) {
            const trimmedData = data.map((row) => {
              return {
                ...row,
                [Object.keys(row)[2]]: row[Object.keys(row)[2]]
                  .trim()
                  .toLowerCase(),
              };
            });

            const emails = trimmedData.map((row) => row[Object.keys(row)[2]]);
            const invalidEmailsList = emails.filter(
              (email) => !validateEmail(email)
            );
            setInvalidEmails(invalidEmailsList);

            const validRows = trimmedData.filter((row) =>
              validateEmail(row[Object.keys(row)[2]])
            );
            const uniqueRows = [];
            const emailSet = new Set();
            const duplicates = [];

            validRows.forEach((row) => {
              const email = row[Object.keys(row)[2]];
              if (!emailSet.has(email)) {
                emailSet.add(email);
                uniqueRows.push(row);
              } else {
                duplicates.push(row);
              }
            });

            setDuplicateRows(duplicates);
            setFilteredData(uniqueRows);
            setCsvData(trimmedData);
            setError(null);
          } else {
            setError("CSV must contain exactly 3 columns.");
            setCsvData(null);
            setInvalidEmails([]);
            setDuplicateRows([]);
            setFilteredData([]);
          }
        }
      },
      error: (err) => {
        setError(err.message);
        setCsvData(null);
        setInvalidEmails([]);
        setDuplicateRows([]);
        setFilteredData([]);
      },
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleDownload = () => {
    if (filteredData().length === 0) return;

    // Convert the filtered data back to CSV format
    const csv = Papa.unparse(filteredData());

    // Create a downloadable link
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${originalFileName()}_fixed.csv`;
    link.click();
  };

  return (
    <div class="p-6 max-w-lg mx-auto">
      <h1 class="text-2xl font-bold mb-4">CSV File Parser</h1>
      <h2 class="text-lg mb-4">
        Upload a CSV file with 3 columns: first_name, last_name, email
      </h2>
      <h2 class="text-lg mb-4 text-green-500">
        Note: All data is processed locally on your computer. This application
        is not run from a server and no data is sent to the internet.
      </h2>
      <p class="text-sm mb-4">
        You can also run this application locally by downloading it:
        <a download="emailcleanup.html" href="/assets/emailcleanup.html">
          Download
        </a>
      </p>
      <p class="text-sm mb-4">
        Audit source:{" "}
        <a href="https://github.com/ebg1223/email-list-cleanup">
          https://github.com/ebg1223/email-list-cleanup
        </a>
      </p>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        class="mb-4 p-2 border border-gray-300 rounded"
      />

      {error() && (
        <div class="mb-4 p-4 bg-red-100 border border-red-400 rounded">
          <h3 class="font-semibold text-red-700 mb-2">Error Parsing CSV:</h3>
          <pre class="text-sm text-red-700">
            {JSON.stringify(error(), null, 2)}
          </pre>
        </div>
      )}

      {invalidEmails().length > 0 && (
        <div class="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 class="font-semibold text-yellow-700 mb-2">
            Invalid Email Addresses:
          </h3>
          <ul class="list-disc pl-5 text-sm text-yellow-700">
            {invalidEmails().map((email, index) => (
              <li key={index}>{email}</li>
            ))}
          </ul>
        </div>
      )}

      {duplicateRows().length > 0 && (
        <div class="mb-4 p-4 bg-orange-100 border border-orange-400 rounded">
          <h3 class="font-semibold text-orange-700 mb-2">Duplicate Rows:</h3>
          <table class="min-w-full border-collapse border border-gray-300 mb-4">
            <thead>
              <tr class="bg-gray-100">
                {Object.keys(duplicateRows()[0]).map((header) => (
                  <th class="border border-gray-300 p-2 text-left font-medium text-gray-700">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {duplicateRows().map((row, index) => (
                <tr key={index} class="odd:bg-white even:bg-gray-50">
                  {Object.values(row).map((value) => (
                    <td class="border border-gray-300 p-2 text-gray-800">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {invalidEmails().length === 0 &&
        duplicateRows().length === 0 &&
        csvData() && (
          <div class="mb-4 p-4 bg-green-100 border border-green-400 rounded">
            <h3 class="font-semibold text-green-700 mb-2">CSV is Valid</h3>
          </div>
        )}

      {(invalidEmails().length > 0 ||
        duplicateRows().length > 0 ||
        (invalidEmails().length === 0 &&
          duplicateRows().length === 0 &&
          csvData())) && (
        <button
          onClick={handleDownload}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download Filtered CSV
        </button>
      )}
    </div>
  );
}

export default CSVParser;
