(function () {
  const { PDFDocument } = PDFLib;

  // Tabs
  const tabMerge = document.getElementById('tabMerge');
  const tabSplit = document.getElementById('tabSplit');
  const panelMerge = document.getElementById('panelMerge');
  const panelSplit = document.getElementById('panelSplit');
  tabMerge.addEventListener('click', () => {
    tabMerge.classList.add('active');
    tabSplit.classList.remove('active');
    panelMerge.classList.add('active');
    panelSplit.classList.remove('active');
  });
  tabSplit.addEventListener('click', () => {
    tabSplit.classList.add('active');
    tabMerge.classList.remove('active');
    panelSplit.classList.add('active');
    panelMerge.classList.remove('active');
  });

  // ---- Merge ----
  const dropzoneMerge = document.getElementById('dropzoneMerge');
  const fileInputMerge = document.getElementById('fileInputMerge');
  const fileListEl = document.getElementById('fileList');
  const mergeBtn = document.getElementById('mergeBtn');
  const status = document.getElementById('status');

  let mergeFiles = [];

  function renderFileList() {
    fileListEl.innerHTML = '';
    mergeFiles.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = '<span>' + (i + 1) + '. ' + f.name + '</span>';
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.title = 'Remove';
      btn.addEventListener('click', () => {
        mergeFiles.splice(i, 1);
        renderFileList();
      });
      li.appendChild(btn);
      fileListEl.appendChild(li);
    });
    mergeBtn.disabled = mergeFiles.length < 2;
  }

  function addMergeFiles(list) {
    const arr = Array.from(list).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    mergeFiles = mergeFiles.concat(arr);
    renderFileList();
  }

  dropzoneMerge.addEventListener('click', () => fileInputMerge.click());
  fileInputMerge.addEventListener('change', (e) => addMergeFiles(e.target.files));
  ['dragenter', 'dragover'].forEach((ev) =>
    dropzoneMerge.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneMerge.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropzoneMerge.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneMerge.classList.remove('drag');
    })
  );
  dropzoneMerge.addEventListener('drop', (e) => addMergeFiles(e.dataTransfer.files));

  mergeBtn.addEventListener('click', async () => {
    mergeBtn.disabled = true;
    status.textContent = 'Merging...';
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of mergeFiles) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(src, src.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'merged.pdf';
      a.click();
      status.textContent = 'Done. Merged ' + mergeFiles.length + ' files, ' + mergedPdf.getPageCount() + ' pages total.';
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      console.error(err);
    } finally {
      mergeBtn.disabled = mergeFiles.length < 2;
    }
  });

  // ---- Split ----
  const dropzoneSplit = document.getElementById('dropzoneSplit');
  const fileInputSplit = document.getElementById('fileInputSplit');
  const splitBtn = document.getElementById('splitBtn');
  const statusSplit = document.getElementById('statusSplit');
  const splitList = document.getElementById('splitList');
  const downloadAllSplitBtn = document.getElementById('downloadAllSplitBtn');

  let splitFile = null;
  let splitResults = [];

  function setSplitFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return;
    splitFile = file;
    splitBtn.disabled = false;
    statusSplit.textContent = file.name + ' ready. Click Split PDF.';
  }

  dropzoneSplit.addEventListener('click', () => fileInputSplit.click());
  fileInputSplit.addEventListener('change', (e) => setSplitFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach((ev) =>
    dropzoneSplit.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneSplit.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropzoneSplit.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzoneSplit.classList.remove('drag');
    })
  );
  dropzoneSplit.addEventListener('drop', (e) => setSplitFile(e.dataTransfer.files[0]));

  splitBtn.addEventListener('click', async () => {
    if (!splitFile) return;
    splitBtn.disabled = true;
    splitList.innerHTML = '';
    splitResults = [];
    downloadAllSplitBtn.style.display = 'none';
    statusSplit.textContent = 'Splitting...';
    try {
      const bytes = await splitFile.arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const count = src.getPageCount();
      for (let i = 0; i < count; i++) {
        const newPdf = await PDFDocument.create();
        const [copied] = await newPdf.copyPages(src, [i]);
        newPdf.addPage(copied);
        const newBytes = await newPdf.save();
        const blob = new Blob([newBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const name = 'page-' + (i + 1) + '.pdf';
        splitResults.push({ name, url });

        const li = document.createElement('li');
        li.innerHTML = '<span>Page ' + (i + 1) + '</span><a class="dl" download="' + name + '" href="' + url + '">Download</a>';
        splitList.appendChild(li);
      }
      statusSplit.textContent = 'Done. ' + count + ' page(s).';
      downloadAllSplitBtn.style.display = count > 1 ? 'inline-block' : 'none';
    } catch (err) {
      statusSplit.textContent = 'Error: ' + err.message;
      console.error(err);
    } finally {
      splitBtn.disabled = false;
    }
  });

  downloadAllSplitBtn.addEventListener('click', () => {
    splitResults.forEach((r, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = r.url;
        a.download = r.name;
        a.click();
      }, i * 200);
    });
  });
})();
