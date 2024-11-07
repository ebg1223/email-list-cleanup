import { createSignal, Show } from "solid-js";
import Papa from "papaparse";

// Add a new type and signal at the top of the component
interface CorrectedEmail {
  originalRow: any;
  correctedEmail: string;
}

function CSVParser() {
  const [csvData, setCsvData] = createSignal(null);
  const [headers, setHeaders] = createSignal([]);
  const [selectedEmailColumn, setSelectedEmailColumn] = createSignal(null);
  const [error, setError] = createSignal(null);
  const [invalidEmails, setInvalidEmails] = createSignal([]);
  const [duplicateRows, setDuplicateRows] = createSignal([]);
  const [filteredData, setFilteredData] = createSignal([]);
  const [originalFileName, setOriginalFileName] = createSignal("filtered_data");
  const [correctedEmails, setCorrectedEmails] = createSignal<
    Record<string, string>
  >({});

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setOriginalFileName(file.name.replace(/\.csv$/, ""));
    setSelectedEmailColumn(null); // Reset selection when new file is uploaded

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(results.errors);
          resetState();
        } else {
          const data = results.data;
          if (data.length > 0) {
            setHeaders(Object.keys(data[0]));
            setCsvData(data);
            setError(null);
          } else {
            setError("CSV appears to be empty.");
            resetState();
          }
        }
      },
      error: (err) => {
        setError(err.message);
        resetState();
      },
    });
  };

  const resetState = () => {
    setCsvData(null);
    setHeaders([]);
    setSelectedEmailColumn(null);
    setInvalidEmails([]);
    setDuplicateRows([]);
    setFilteredData([]);
  };

  const processData = () => {
    if (!csvData() || !selectedEmailColumn()) return;

    const data = csvData();
    const emailColumn = selectedEmailColumn();

    // Process the data with the selected email column
    const trimmedData = data.map((row) => ({
      ...row,
      [emailColumn]: row[emailColumn].trim().toLowerCase(),
    }));

    // Modified to store the entire row for invalid emails
    const invalidRowsList = trimmedData.filter(
      (row) => !validateEmail(row[emailColumn])
    );
    setInvalidEmails(invalidRowsList);

    const validRows = trimmedData.filter((row) =>
      validateEmail(row[emailColumn])
    );
    const uniqueRows = [];
    const emailSet = new Set();
    const duplicates = [];

    validRows.forEach((row) => {
      const email = row[emailColumn];
      if (!emailSet.has(email)) {
        emailSet.add(email);
        uniqueRows.push(row);
      } else {
        duplicates.push(row);
      }
    });

    setDuplicateRows(duplicates);
    setFilteredData(uniqueRows);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleDownload = () => {
    if (
      filteredData().length === 0 &&
      Object.keys(correctedEmails()).length === 0
    )
      return;

    // Get the valid rows
    let downloadData = [...filteredData()];

    // Add corrected rows
    invalidEmails().forEach((row) => {
      const correctedEmail = correctedEmails()[JSON.stringify(row)];
      if (correctedEmail) {
        const correctedRow = {
          ...row,
          [selectedEmailColumn()]: correctedEmail,
        };
        downloadData.push(correctedRow);
      }
    });

    const csv = Papa.unparse(downloadData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${originalFileName()}_fixed.csv`;
    link.click();
  };

  // Add a handler for email corrections
  const handleEmailCorrection = (originalRow: any, newEmail: string) => {
    if (validateEmail(newEmail)) {
      setCorrectedEmails((prev) => ({
        ...prev,
        [JSON.stringify(originalRow)]: newEmail,
      }));
    }
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
      <p class="mb-4">
        You can also run this application locally by downloading it:{" "}
        <a
          class="underline text-blue-500 hover:text-blue-600"
          download="emailcleanup.html"
          href="/assets/emailcleanup.html"
        >
          Download
        </a>
      </p>
      <p class="text-xs mb-4">
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

      <Show when={headers().length > 0 && !selectedEmailColumn()}>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Select Email Column:
          </label>
          <select
            class="w-full p-2 border border-gray-300 rounded"
            onChange={(e) => {
              setSelectedEmailColumn(e.target.value);
              processData();
            }}
          >
            <option value="">Select a column...</option>
            {headers().map((header) => (
              <option value={header}>{header}</option>
            ))}
          </select>
        </div>
      </Show>

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
          <div class="space-y-4">
            {invalidEmails().map((row) => {
              const rowKey = JSON.stringify(row);
              const correctedEmail = correctedEmails()[rowKey];
              const isFixed = correctedEmail && validateEmail(correctedEmail);

              return (
                <div
                  class={`p-3 rounded ${
                    isFixed ? "bg-green-50" : "bg-yellow-50"
                  } border ${
                    isFixed ? "border-green-400" : "border-yellow-400"
                  }`}
                >
                  <table class="min-w-full border-collapse mb-2">
                    <thead>
                      <tr>
                        {headers().map((header) => (
                          <th
                            class={`border p-2 text-left font-medium ${
                              isFixed
                                ? "border-green-400 text-green-700"
                                : "border-yellow-400 text-yellow-700"
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {headers().map((header) => (
                          <td
                            class={`border p-2 ${
                              isFixed
                                ? "border-green-400 text-green-700"
                                : "border-yellow-400 text-yellow-700"
                            }`}
                          >
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-2 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Enter corrected email"
                      value={correctedEmail || ""}
                      onInput={(e) =>
                        handleEmailCorrection(row, e.currentTarget.value)
                      }
                      class={`p-1 border rounded flex-grow ${
                        isFixed
                          ? "border-green-400 bg-green-50"
                          : "border-yellow-400 bg-yellow-50"
                      }`}
                    />
                    {isFixed && (
                      <span class="text-green-600 text-sm">✓ Corrected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
