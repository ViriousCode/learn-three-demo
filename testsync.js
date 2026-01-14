// 请求 API 端点
async function fetchDocumentList() {
  try {
    const url = 'http://183.131.246.44:3001/api/modmanage/GetDocumentList';
    // 请求参数
    const requestBody = {
      keyword: "",
      pageIndex: 0,
      pageSize: 20,
      subtype: 1,
      type: 2
    };
    // 使用 POST 方法发送请求
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('请求成功!');
    return data;
  } catch (error) {
    console.error('请求失败:', error.message);
    throw error;
  }
}

// 请求 API 端点
async function fetchUploadUrl(fileName) {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxZTdkMjFlOC0zOGJlLTQzYmItYjBmOC02YTQyZThmMmRhNjciLCJuYW1lIjoiYXp1cmFhZG0iLCJyb2xlIjoidXNlciIsIm5iZiI6MTc2MzAwODgwNywiZXhwIjoxNzYzMDY4ODA3LCJpYXQiOjE3NjMwMDg4MDcsImlzcyI6Imp3dEFlcEF6dXJhIiwiYXVkIjoiand0QXp1cmFBUEkifQ.kfaKvzl4-GZW_7SMeRoJOr5hkbJ7K_ybPubexaoun4I'
  try {
    const url = 'http://dev3.azuratech.com:3001/env/v1/UpFile/Get-Upload-Url';
    // 请求参数
   
    let response = await fetch(url + '?fileName=' + fileName, {
      "headers": {
        "accept": "application/json",
        "accept-language": "zh-CN,zh;q=0.9",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxZTdkMjFlOC0zOGJlLTQzYmItYjBmOC02YTQyZThmMmRhNjciLCJuYW1lIjoiYXp1cmFhZG0iLCJyb2xlIjoidXNlciIsIm5iZiI6MTc2MzAwODgwNywiZXhwIjoxNzYzMDY4ODA3LCJpYXQiOjE3NjMwMDg4MDcsImlzcyI6Imp3dEFlcEF6dXJhIiwiYXVkIjoiand0QXp1cmFBUEkifQ.kfaKvzl4-GZW_7SMeRoJOr5hkbJ7K_ybPubexaoun4I",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "cookie": "aepToken=CfDJ8DyFMtwfu8NLiIXNNNCHFisgwO_H3rSWblwSHWsHkyp01sAdFrxLGsD5OpsN8Hc3JfMSXfXwd-ywcqJmsAmgLgE0qXwkkmPQ27VBfO92F9pmE97Rnxbd4ztBPzZfgiWVmUbe5fYZKMhk7i5FhXz5W-5BfitI14Ns43upK-7HDrd2WegZMai2A61CoeffdkSHL7jZJbdJaZaTWcL03LHXlnvm6ZpCGXGFVKmF3RSlY9V2g9x5jMDKPnDtSDE9jckf33xR7nU1ot6OjD4kYb6K25JEIrPj94mpKgHPrt5IDC3-vgMGQDKJCBjMiH5hx4prXcciPZRFxe8G6yOU_DIHKtX9sFf72t5pLvuPp88_ruLUdIrZlyUuuNFnMlBE3JBzTNd7q-zAgtDNSDldnEKnvXR7_C6MiR-plF0j35jSEHIqHgOLmXW6BNnGxD_aYsdJ7waUZBOX0Dy1etj9nIYNr-Kd7R95TxkXr36NKNmL6780A-aVm2rOa5dkcjINVeC13tHaC25O_WKkOFzkzEVlspN9GcR7fuCyp9_Z7p-IynrWwFxD9oQpAtqxf4M5VDkct2NbuAcMBSIVIHFp0o33f9o; AzuraCookie=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxZTdkMjFlOC0zOGJlLTQzYmItYjBmOC02YTQyZThmMmRhNjciLCJuYW1lIjoiYXp1cmFhZG0iLCJyb2xlIjoidXNlciIsIm5iZiI6MTc2MzAwODgwNywiZXhwIjoxNzYzMDY4ODA3LCJpYXQiOjE3NjMwMDg4MDcsImlzcyI6Imp3dEFlcEF6dXJhIiwiYXVkIjoiand0QXp1cmFBUEkifQ.kfaKvzl4-GZW_7SMeRoJOr5hkbJ7K_ybPubexaoun4I",
        "Referer": "http://dev3.azuratech.com:3011/water/"
      },
      "body": null,
      "method": "GET"
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('请求成功!');
    return data;
  } catch (error) {
    console.error('请求失败:', error.message);
    throw error;
  }
}

// async function uploadFile(fileName: string, blob: Blob) {
//   try {
//       const { newFileName, uploadUrl } = await getUploadUrl(fileName);
//       await fetch(uploadUrl, { method: 'PUT', body: blob });
//       return {
//           fileName,
//           newFileName,
//           uploadUrl,
//           size: blob.size,
//       };
//   } catch (error) {
//       console.error(error);
//       return undefined;
//   }
// }

// 执行请求
// const t = await fetchDocumentList()
// console.log('\n请求完成', t?.list[0]);
// const url = 'http://183.131.246.44:3001' + t?.list[0]?.url;
// const response = await fetch(url);
// console.log('请求成功!', response);

const aa = await fetchUploadUrl('test.txt');
console.log('请求成功!', aa);
