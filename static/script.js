let analysisData = null;
let campaignOffers = {};

// Load campaign offers on page load
loadCampaignOffers();

async function loadCampaignOffers() {
    try {
        const response = await fetch('/api/campaign-offers');
        campaignOffers = await response.json();
    } catch (error) {
        console.error('Error loading campaign offers:', error);
    }
}

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('analyzeBtn').disabled = false;
    }
});

// Modal handlers
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = function() {
        document.getElementById('offerModal').style.display = 'none';
        document.getElementById('emailModal').style.display = 'none';
    }
});

window.onclick = function(event) {
    const offerModal = document.getElementById('offerModal');
    const emailModal = document.getElementById('emailModal');
    if (event.target === offerModal) {
        offerModal.style.display = 'none';
    }
    if (event.target === emailModal) {
        emailModal.style.display = 'none';
    }
}

document.getElementById('analyzeBtn').addEventListener('click', async function() {
    const fileInput = document.getElementById('fileInput');
    
    if (!fileInput.files[0]) {
        alert('Please select a CSV file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('Error: ' + data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }
        
        analysisData = data;
        displayResults(data);
        
    } catch (error) {
        alert('Error analyzing data: ' + error.message);
        document.getElementById('loading').style.display = 'none';
    }
});

function displayResults(data) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    
    // Update summary cards
    document.getElementById('totalCustomers').textContent = data.summary.total_customers;
    document.getElementById('totalSegments').textContent = data.group_stats.length;
    
    // Calculate average spending
    const totalMonetary = data.rfm_data.reduce((sum, customer) => sum + customer.Monetary, 0);
    const avgSpending = (totalMonetary / data.rfm_data.length).toFixed(2);
    document.getElementById('avgSpending').textContent = avgSpending;
    
    // Create chart
    createChart(data.group_stats);
    
    // Display segments
    displaySegments(data);
    
    // Display table
    displayTable(data.rfm_data);
    
    // Set up search and filter
    document.getElementById('searchInput').addEventListener('input', filterTable);
    document.getElementById('filterSelect').addEventListener('change', filterTable);
}

function createChart(groupStats) {
    const ctx = document.getElementById('segmentChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.myChart) {
        window.myChart.destroy();
    }
    
    const labels = groupStats.map(s => s.Group);
    const counts = groupStats.map(s => s.count);
    const colors = {
        'Platinum': '#b19cd9',
        'Gold': '#f4d03f',
        'Silver': '#c0c0c0',
        'Bronze': '#cd7f32'
    };
    
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Customers',
                data: counts,
                backgroundColor: labels.map(l => colors[l]),
                borderColor: labels.map(l => colors[l]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Customer Distribution by Segment'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function displaySegments(data) {
    const segmentsGrid = document.getElementById('segmentsGrid');
    segmentsGrid.innerHTML = '';
    
    const clusterStats = data.cluster_stats;
    
    data.group_stats.forEach(stat => {
        const segmentCard = document.createElement('div');
        segmentCard.className = `segment-card segment-${stat.Group.toLowerCase()}`;
        
        const clusterData = clusterStats[Object.keys(clusterStats).find(k => {
            const index = parseInt(k);
            return data.rfm_data[0].Clusters === index || 
                   (index === 0 && data.rfm_data.some(c => c.Clusters === 0 && c.Group === stat.Group));
        })];
        
        segmentCard.innerHTML = `
            <h4>${stat.Group} Customers</h4>
            <div class="segment-stats">
                <li><strong>Count:</strong> ${stat.count}</li>
                <li><strong>Avg Recency:</strong> ${clusterData ? Math.round(clusterData.Recency) : 'N/A'} days</li>
                <li><strong>Avg Frequency:</strong> ${clusterData ? Math.round(clusterData.Frequency) : 'N/A'}</li>
                <li><strong>Avg Monetary:</strong> ${clusterData ? clusterData.Monetary.toFixed(2) : 'N/A'} BDT</li>
            </div>
        `;
        
        segmentsGrid.appendChild(segmentCard);
    });
    
    // Display campaign management cards
    displayCampaignCards(data);
}

function displayCampaignCards(data) {
    const campaignGrid = document.getElementById('campaignGrid');
    campaignGrid.innerHTML = '';
    
    data.group_stats.forEach(stat => {
        const segment = stat.Group;
        const offer = campaignOffers[segment] || { subject: 'No offer defined', message: 'Please edit to add offer' };
        
        const campaignCard = document.createElement('div');
        campaignCard.className = 'campaign-card';
        campaignCard.innerHTML = `
            <h4>${segment} Segment</h4>
            <div class="campaign-offer">
                <strong>Current Offer:</strong>
                <p><strong>Subject:</strong> ${offer.subject}</p>
                <p><strong>Message:</strong> ${offer.message}</p>
            </div>
            <div class="campaign-actions">
                <button class="btn-edit" onclick="editOffer('${segment}')">✏️ Edit Offer</button>
                <button class="btn-send" onclick="sendCampaignEmails('${segment}')">📧 Send Emails</button>
            </div>
        `;
        
        campaignGrid.appendChild(campaignCard);
    });
}

async function editOffer(segment) {
    const offer = campaignOffers[segment] || { subject: '', message: '' };
    
    document.getElementById('segmentName').value = segment;
    document.getElementById('offerSubject').value = offer.subject;
    document.getElementById('offerMessage').value = offer.message;
    
    document.getElementById('offerModal').style.display = 'block';
    window.currentSegment = segment;
}

async function saveOffer() {
    const segment = window.currentSegment;
    const subject = document.getElementById('offerSubject').value;
    const message = document.getElementById('offerMessage').value;
    
    if (!subject || !message) {
        alert('Please fill in both subject and message');
        return;
    }
    
    campaignOffers[segment] = { subject, message };
    
    try {
        const response = await fetch('/api/campaign-offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignOffers)
        });
        
        if (response.ok) {
            alert('Offer saved successfully!');
            document.getElementById('offerModal').style.display = 'none';
            // Refresh campaign cards
            if (analysisData) {
                displayCampaignCards(analysisData);
            }
        }
    } catch (error) {
        alert('Error saving offer: ' + error.message);
    }
}

async function sendCampaignEmails(segment) {
    if (!analysisData) {
        alert('Please analyze data first');
        return;
    }
    
    // Filter customers by segment
    const segmentCustomers = analysisData.rfm_data.filter(c => c.Group === segment);
    const validCustomers = segmentCustomers.filter(c => c.Email && c.Email !== 'N/A');
    
    if (validCustomers.length === 0) {
        alert(`No valid email addresses for ${segment} customers`);
        return;
    }
    
    if (!confirm(`Send campaign emails to ${validCustomers.length} ${segment} customers?`)) {
        return;
    }
    
    document.getElementById('emailModal').style.display = 'block';
    document.getElementById('emailProgress').style.width = '0%';
    document.getElementById('emailResult').textContent = 'Sending emails...';
    
    try {
        const response = await fetch('/api/send-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                segment: segment,
                customers: validCustomers
            })
        });
        
        const result = await response.json();
        
        document.getElementById('emailProgress').style.width = '100%';
        
        if (result.success) {
            document.getElementById('emailResult').textContent = 
                `✅ Successfully sent ${result.sent} out of ${result.total} emails`;
        } else {
            document.getElementById('emailResult').textContent = 
                `❌ Error: ${result.error || 'Unknown error'}`;
        }
    } catch (error) {
        document.getElementById('emailProgress').style.width = '0%';
        document.getElementById('emailResult').textContent = 
            `❌ Error sending emails: ${error.message}`;
    }
}

function displayTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    data.forEach(customer => {
        const row = document.createElement('tr');
        
        const badgeClass = `badge-${customer.Group.toLowerCase()}`;
        
        row.innerHTML = `
            <td>${customer.CustomerID}</td>
            <td>${customer.Location || 'N/A'}</td>
            <td>${customer.CustomerPhoneNo || 'N/A'}</td>
            <td>${customer.Email || 'N/A'}</td>
            <td><span class="badge ${badgeClass}">${customer.Group}</span></td>
            <td>${customer.Recency} days</td>
            <td>${customer.Frequency}</td>
            <td>${customer.Monetary.toFixed(2)} BDT</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterTable() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const filterSelect = document.getElementById('filterSelect').value;
    const rows = document.querySelectorAll('#tableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const group = row.querySelector('.badge').textContent;
        
        const matchesSearch = text.includes(searchInput);
        const matchesFilter = filterSelect === 'all' || group === filterSelect;
        
        if (matchesSearch && matchesFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function toggleTable() {
    const tableSection = document.querySelector('.table-section');
    tableSection.classList.toggle('collapsed');
}

async function downloadSegment(segment) {
    if (!analysisData) {
        alert('Please analyze data first');
        return;
    }
    
    // Filter customers by segment (handle both capital and lowercase)
    const segmentCapitalized = segment.charAt(0).toUpperCase() + segment.slice(1);
    const segmentCustomers = analysisData.rfm_data.filter(c => c.Group === segmentCapitalized);
    
    if (segmentCustomers.length === 0) {
        alert(`No ${segmentCapitalized} customers found`);
        return;
    }
    
    // Prepare data for download
    const customerList = segmentCustomers.map(c => ({
        CustomerID: c.CustomerID,
        Location: c.Location || 'N/A',
        CustomerPhoneNo: c.CustomerPhoneNo || 'N/A',
        Email: c.Email || 'N/A',
        Recency: c.Recency,
        Frequency: c.Frequency,
        Monetary: c.Monetary,
        Group: c.Group
    }));
    
    // Send to server for CSV generation
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                segment: segmentCapitalized,
                customers: customerList
            })
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${segmentCapitalized}_customers.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        alert('Error downloading file: ' + error.message);
    }
}

