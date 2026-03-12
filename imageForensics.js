/**
 * Local Image Forensics Analysis Engine
 * No API calls needed - everything runs on the client
 */

// ===== EXIF Metadata Parser =====

export class ExifParser {
  static parseExif(uint8Array) {
    const exif = {};
    
    // Check for JPEG marker
    if (uint8Array[0] !== 0xff || uint8Array[1] !== 0xd8) {
      return { error: 'Not a valid JPEG' };
    }

    let offset = 2;
    while (offset < uint8Array.length) {
      if (uint8Array[offset] !== 0xff) break;
      
      const marker = uint8Array[offset + 1];
      offset += 2;

      // APP1 marker (EXIF data)
      if (marker === 0xe1) {
        const length = (uint8Array[offset] << 8) | uint8Array[offset + 1];
        offset += 2;
        
        // Check for EXIF header
        const exifHeader = String.fromCharCode(...uint8Array.slice(offset, offset + 6));
        if (exifHeader.startsWith('Exif')) {
          try {
            const exifData = uint8Array.slice(offset + 6, offset + length);
            return ExifParser.parseIFD(exifData);
          } catch (e) {
            return { error: 'Failed to parse EXIF' };
          }
        }
        offset += length - 2;
      } else {
        const length = (uint8Array[offset] << 8) | uint8Array[offset + 1];
        offset += length;
      }
    }

    return exif;
  }

  static parseIFD(data) {
    const exif = {};
    
    // This is simplified EXIF parsing
    // In a real scenario, you'd do full TIFF structure parsing
    const dataStr = String.fromCharCode(...data);
    
    // Look for common EXIF patterns
    if (dataStr.includes('Apple')) exif.make = 'Apple';
    if (dataStr.includes('Canon')) exif.make = 'Canon';
    if (dataStr.includes('Nikon')) exif.make = 'Nikon';
    if (dataStr.includes('Sony')) exif.make = 'Sony';

    return exif;
  }
}

// ===== Image Heuristic Analysis =====

export class ImageForensics {
  static analyzeImage(imageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0);

    const findings = [];
    let suspicionScore = 0;

    // 1. Analyze pixel distribution
    const pixelAnalysis = this.analyzePixelDistribution(ctx, canvas.width, canvas.height);
    findings.push(...pixelAnalysis.findings);
    suspicionScore += pixelAnalysis.score;

    // 2. Detect compression artifacts
    const compressionAnalysis = this.detectCompressionArtifacts(ctx, canvas.width, canvas.height);
    findings.push(...compressionAnalysis.findings);
    suspicionScore += compressionAnalysis.score;

    // 3. Analyze color space consistency
    const colorAnalysis = this.analyzeColorSpace(ctx, canvas.width, canvas.height);
    findings.push(...colorAnalysis.findings);
    suspicionScore += colorAnalysis.score;

    // 4. Edge detection for manipulation
    const edgeAnalysis = this.analyzeEdges(ctx, canvas.width, canvas.height);
    findings.push(...edgeAnalysis.findings);
    suspicionScore += edgeAnalysis.score;

    // 5. Check for inconsistent lighting
    const lightingAnalysis = this.analyzeLighting(ctx, canvas.width, canvas.height);
    findings.push(...lightingAnalysis.findings);
    suspicionScore += lightingAnalysis.score;

    return {
      suspicionScore: Math.min(100, suspicionScore),
      findings,
      analysis: `Local forensics analysis detected ${findings.length} indicators. Overall suspicion level: ${Math.min(100, suspicionScore)}%.`
    };
  }

  // Analyze pixel distribution for unnatural patterns
  static analyzePixelDistribution(ctx, width, height) {
    const findings = [];
    let score = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const histogram = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0)
    };

    // Build histogram
    for (let i = 0; i < data.length; i += 4) {
      histogram.r[data[i]]++;
      histogram.g[data[i + 1]]++;
      histogram.b[data[i + 2]]++;
    }

    // Calculate variance for each channel
    const getVariance = (arr) => {
      const mean = arr.reduce((a, b) => a + b) / arr.length;
      const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2)) / arr.length;
      return variance;
    };

    const rVar = getVariance(histogram.r);
    const gVar = getVariance(histogram.g);
    const bVar = getVariance(histogram.b);
    const avgVar = (rVar + gVar + bVar) / 3;

    // Too smooth distribution suggests AI generation or heavy filtering
    if (avgVar < 120) {
      findings.push('Critical: Extremely smooth pixel distribution (strong AI generation indicator)');
      score += 32;
    } else if (avgVar < 160) {
      findings.push('Suspicious: Unusually smooth color distribution (possible AI generation)');
      score += 26;
    }

    // Check for posterization (too few unique colors)
    const uniqueR = histogram.r.filter(v => v > 0).length;
    const uniqueG = histogram.g.filter(v => v > 0).length;
    const uniqueB = histogram.b.filter(v => v > 0).length;
    const avgUnique = (uniqueR + uniqueG + uniqueB) / 3;

    if (avgUnique < 65) {
      findings.push('Critical: Severe posterization detected (strong manipulation indicator)');
      score += 35;
    } else if (uniqueR < 85 || uniqueG < 85 || uniqueB < 85) {
      findings.push('Suspicious: Posterization detected (possible manipulation)');
      score += 29;
    }

    // Check for overly uniform colors (AI artifact)
    const highFreqColors = Object.values(histogram).flat().filter(v => v > 1000).length;
    if (highFreqColors > 25) {
      findings.push('Suspicious: High concentration of uniform colors (AI generation indicator)');
      score += 24;
    } else if (highFreqColors > 15) {
      findings.push('Suspicious: Unusually uniform color distribution');
      score += 16;
    }

    // Check color balance (natural images are more balanced)
    const rMean = histogram.r.reduce((a, b, i) => a + b * i, 0) / data.length * 4;
    const gMean = histogram.g.reduce((a, b, i) => a + b * i, 0) / data.length * 4;
    const bMean = histogram.b.reduce((a, b, i) => a + b * i, 0) / data.length * 4;
    
    const colorImbalance = Math.max(Math.abs(rMean - 127.5), Math.abs(gMean - 127.5), Math.abs(bMean - 127.5));
    if (colorImbalance > 80) {
      findings.push('Suspicious: Severe color balance issues detected');
      score += 15;
    }

    return { findings, score };
  }

  // Detect JPEG compression artifact patterns
  static detectCompressionArtifacts(ctx, width, height) {
    const findings = [];
    let score = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Look for 8x8 block patterns typical of JPEG compression
    let artifactCount = 0;
    const blockSize = 8;
    let totalBlocks = 0;

    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        totalBlocks++;
        
        // Calculate variance within block
        let blockVariance = 0;
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            const idx = ((y + by) * width + (x + bx)) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            blockVariance += (r + g + b) / 3;
          }
        }

        // Check block edges for discontinuities (more sensitive)
        if (x + blockSize < width) {
          let edgeJump = 0;
          for (let by = 0; by < blockSize; by++) {
            const idx1 = ((y + by) * width + (x + blockSize - 1)) * 4;
            const idx2 = ((y + by) * width + (x + blockSize)) * 4;
            edgeJump += Math.abs(data[idx1] - data[idx2]);
            edgeJump += Math.abs(data[idx1 + 1] - data[idx2 + 1]);
            edgeJump += Math.abs(data[idx1 + 2] - data[idx2 + 2]);
          }
          if (edgeJump > 200) {
            artifactCount++;
          } else if (edgeJump > 120) {
            artifactCount += 0.5; // Half-weight for moderate artifacts
          }
        }
        
        // Also check vertical edges
        if (y + blockSize < height) {
          let edgeJump = 0;
          for (let bx = 0; bx < blockSize; bx++) {
            const idx1 = ((y + blockSize - 1) * width + (x + bx)) * 4;
            const idx2 = ((y + blockSize) * width + (x + bx)) * 4;
            edgeJump += Math.abs(data[idx1] - data[idx2]);
            edgeJump += Math.abs(data[idx1 + 1] - data[idx2 + 1]);
            edgeJump += Math.abs(data[idx1 + 2] - data[idx2 + 2]);
          }
          if (edgeJump > 200) {
            artifactCount++;
          }
        }
      }
    }

    const artifactPercentage = ((artifactCount / (totalBlocks * 2)) * 100);
    
    if (artifactPercentage > 14) {
      findings.push(`Critical: Heavy compression artifacts detected (${artifactPercentage.toFixed(1)}% of blocks)`);
      score += 38;
    } else if (artifactPercentage > 9) {
      findings.push(`Suspicious: Compression artifacts detected (${artifactPercentage.toFixed(1)}% of blocks)`);
      score += 32;
    } else if (artifactPercentage > 5) {
      findings.push(`Minor compression artifacts found (${artifactPercentage.toFixed(1)}%)`);
      score += 18;
    }

    return { findings, score };
  }

  // Analyze RGB color space consistency
  static analyzeColorSpace(ctx, width, height) {
    const findings = [];
    let score = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate RGB channel correlations
    let sumR = 0, sumG = 0, sumB = 0;
    let countPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      countPixels++;
    }

    const meanR = sumR / countPixels;
    const meanG = sumG / countPixels;
    const meanB = sumB / countPixels;

    // Calculate covariance
    let covRG = 0, covRB = 0, covGB = 0;
    let varR = 0, varG = 0, varB = 0;

    for (let i = 0; i < data.length; i += 4) {
      const devR = data[i] - meanR;
      const devG = data[i + 1] - meanG;
      const devB = data[i + 2] - meanB;

      covRG += devR * devG;
      covRB += devR * devB;
      covGB += devG * devB;
      varR += devR * devR;
      varG += devG * devG;
      varB += devB * devB;
    }

    covRG /= countPixels;
    covRB /= countPixels;
    covGB /= countPixels;
    varR /= countPixels;
    varG /= countPixels;
    varB /= countPixels;

    // Calculate Pearson correlation coefficients
    const corrRG = covRG / Math.sqrt(varR * varG);
    const corrRB = covRB / Math.sqrt(varR * varB);
    const corrGB = covGB / Math.sqrt(varG * varB);
    
    const avgCorr = (Math.abs(corrRG) + Math.abs(corrRB) + Math.abs(corrGB)) / 3;

    // Natural images have high channel correlation
    if (avgCorr < 0.3) {
      findings.push('Critical: Very unusual channel correlation pattern (strong AI indicator)');
      score += 30;
    } else if (avgCorr < 0.5) {
      findings.push('Suspicious: Low channel correlation (indicates potential manipulation)');
      score += 24;
    } else if (avgCorr < 0.65) {
      findings.push('Suspicious: Below-average channel correlation');
      score += 14;
    }

    return { findings, score };
  }

  // Detect edge inconsistencies using simplified Sobel
  static analyzeEdges(ctx, width, height) {
    const findings = [];
    let score = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Simplified Sobel edge detection
    let totalEdgeStrength = 0;
    let edgePixels = 0;
    let veryWeakEdges = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Get grayscale values for neighbors
        const getGray = (px, py) => {
          const idx = (py * width + px) * 4;
          return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        };

        const gx = -getGray(x - 1, y - 1) - 2 * getGray(x - 1, y) - getGray(x - 1, y + 1) +
                    getGray(x + 1, y - 1) + 2 * getGray(x + 1, y) + getGray(x + 1, y + 1);

        const gy = -getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1) +
                    getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1);

        const edgeStrength = Math.sqrt(gx * gx + gy * gy);
        totalEdgeStrength += edgeStrength;
        if (edgeStrength > 50) edgePixels++;
        if (edgeStrength > 0 && edgeStrength < 5) veryWeakEdges++;
      }
    }

    const avgEdgeStrength = totalEdgeStrength / ((width - 2) * (height - 2));
    const edgePixelRatio = edgePixels / ((width - 2) * (height - 2));

    // Very smooth images (low edges) might indicate over-processing or AI generation
    if (avgEdgeStrength < 8) {
      findings.push('Critical: Extremely limited edge detail (strong AI generation indicator)');
      score += 32;
    } else if (avgEdgeStrength < 12) {
      findings.push('Suspicious: Image lacks edge detail (possibly over-processed or AI-generated)');
      score += 26;
    } else if (avgEdgeStrength < 16) {
      findings.push('Suspicious: Below-average edge detail');
      score += 16;
    }

    // Check edge pixel distribution (AI images have sparse, uniform edges)
    if (edgePixelRatio < 0.05) {
      score += 12;
      findings.push('Suspicious: Very few edge pixels detected (possible AI generation)');
    }

    return { findings, score };
  }

  // Check for lighting consistency
  static analyzeLighting(ctx, width, height) {
    const findings = [];
    let score = 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Divide image into quadrants and check brightness
    const quadWidth = Math.floor(width / 2);
    const quadHeight = Math.floor(height / 2);

    const getQuadrantBrightness = (startX, startY, endX, endY) => {
      let brightness = 0;
      let count = 0;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          brightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
      }
      return brightness / count;
    };

    const b1 = getQuadrantBrightness(0, 0, quadWidth, quadHeight);
    const b2 = getQuadrantBrightness(quadWidth, 0, width, quadHeight);
    const b3 = getQuadrantBrightness(0, quadHeight, quadWidth, height);
    const b4 = getQuadrantBrightness(quadWidth, quadHeight, width, height);

    const brightnesses = [b1, b2, b3, b4];
    const meanBrightness = brightnesses.reduce((a, b) => a + b) / 4;
    const variance = brightnesses.reduce((a, b) => a + Math.pow(b - meanBrightness, 2)) / 4;
    const stdDev = Math.sqrt(variance);

    // Also check 9-region grid for more sensitive detection
    const gridSize = 3;
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);
    const gridBrightnesses = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const startX = col * cellWidth;
        const startY = row * cellHeight;
        const endX = (col === gridSize - 1) ? width : (col + 1) * cellWidth;
        const endY = (row === gridSize - 1) ? height : (row + 1) * cellHeight;
        gridBrightnesses.push(getQuadrantBrightness(startX, startY, endX, endY));
      }
    }

    const gridMean = gridBrightnesses.reduce((a, b) => a + b) / gridBrightnesses.length;
    const gridVariance = gridBrightnesses.reduce((a, b) => a + Math.pow(b - gridMean, 2)) / gridBrightnesses.length;

    // High lighting variance suggests inconsistent light sources
    if (gridVariance > 3200) {
      findings.push('Critical: Severe inconsistent lighting (AI generation indicator)');
      score += 28;
    } else if (variance > 2800) {
      findings.push('Suspicious: Severe inconsistent lighting across regions');
      score += 25;
    } else if (variance > 1800) {
      findings.push('Suspicious: Uneven lighting distribution detected');
      score += 18;
    } else if (variance > 900) {
      findings.push('Suspicious: Minor lighting inconsistencies');
      score += 10;
    }

    // Natural images typically have light variation (too uniform is suspicious)
    if (variance < 100) {
      findings.push('Suspicious: Unnaturally uniform lighting (possible AI generation)');
      score += 16;
    }

    return { findings, score };
  }
}

export function analyzeImageLocal(imageElement) {
  const analysis = ImageForensics.analyzeImage(imageElement);
  
  const suspicion = analysis.suspicionScore;
  let verdict = 'Appears Authentic';
  let verdictClass = 'real';
  
  // Improved thresholds with better granularity
  if (suspicion > 60) {
    verdict = 'Likely Manipulated';
    verdictClass = 'fake';
  } else if (suspicion > 40) {
    verdict = 'Inconclusive';
    verdictClass = 'uncertain';
  }

  // Improved confidence calculation based on suspicion score
  let confidence;
  if (verdictClass === 'fake') {
    // For fake images: higher suspicion = higher confidence, minimum 65%
    confidence = Math.min(95, Math.max(65, 55 + (suspicion - 60) * 1.8));
  } else if (verdictClass === 'uncertain') {
    // For uncertain: stay in 45-62 range
    const range = 45 + ((suspicion - 40) / 20) * 17;
    confidence = Math.max(45, Math.min(62, range));
  } else {
    // For real images: lower suspicion = higher confidence, minimum 55%
    if (suspicion < 20) {
      confidence = Math.min(92, 82 - (suspicion * 1.5));
    } else {
      confidence = Math.max(55, 90 - (suspicion * 1.3));
    }
  }

  return {
    isManipulated: verdictClass !== 'real',
    confidence: Math.round(Math.max(45, Math.min(95, confidence))),
    analysis: `Forensics analysis detected ${analysis.findings.length} indicators. Suspicion level: ${Math.round(suspicion)}/100.`,
    findings: analysis.findings,
    suspiciousAreas: analysis.findings.length > 2 ? analysis.findings.slice(0, 2) : analysis.findings,
    recommendation: verdictClass === 'fake' 
      ? '⚠️ Image shows multiple signs of manipulation. Verify with original source before sharing.' 
      : verdictClass === 'uncertain'
      ? '❓ Results inconclusive. Consider using multiple verification methods or comparing with original source.'
      : '✓ Image appears authentic. No major red flags detected in forensic analysis.',
    verdict,
    verdictClass
  };
}
