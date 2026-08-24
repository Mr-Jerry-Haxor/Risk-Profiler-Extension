var S={VERSION:"1.0.0",MAX_CONCURRENT_VALIDATIONS:5,STORAGE_KEYS:{SETTINGS:"settings",ASSESSMENTS:"assessments",SELECTED_ASSESSMENTS:"selectedAssessments",CONTEXTS:"contexts",VALIDATIONS:"validations",REVIEWS:"reviews",LAST_RUN:"lastRun",LAST_ACTION:"lastAction",DEBUG:"debug",WHATS_NEW_MODAL:"whatsNewModalState",REVIEW_MODE:"reviewMode",ASA_SETTINGS:"asaSettings"}},K=!0,z={INITIAL:"initial",SELECTED_ANSWERS:"selectedAnswers"};var se={PRIMARY_ASSESSMENTS:"https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",ASSESSMENT_DETAIL:"https://cairois.web.boeing.com/api/assessment/{id}/detail",ASSESSMENT_ANSWERS:"https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",ASSESSMENT_CONTACTS:"https://cairois.web.boeing.com/api/assessment/{id}/contacts",SURVEY_TEMPLATE_QUESTIONS:"https://cairois.web.boeing.com/api/survey/template/{id}/questions",SURVEY_TEMPLATE_DETAIL:"https://cairois.web.boeing.com/api/surveyTemplate/{id}",SURVEY_TEMPLATES_RP_APP:"https://cairois.web.boeing.com/api/surveyTemplate?where=alternateSurveyTemplateId:=:rp-app",REVIEW_SUMMARY:"https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",ESATS_VERSIONS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",ESATS_ARTIFACTS:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",ESATS_CONTACT_DETAILS_SUMMARY:"https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationSummary/GetContactDetailsSummary?esatsId={assetId}",GTC_LOOKUP:"https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"},Ye=[{id:"cairo",name:"Cairo",url:se.PRIMARY_ASSESSMENTS,openUrl:"https://cairois.web.boeing.com/",expectedHosts:["cairois.web.boeing.com"]},{id:"esats",name:"ESATS",url:"https://service-gateway.tas-phx.apps.boeing.com/",openUrl:"https://esats.web.boeing.com/",expectedHosts:["service-gateway.tas-phx.apps.boeing.com","esats.web.boeing.com"]},{id:"gtc",name:"GTC",url:"https://termbank.web.boeing.com/",openUrl:"https://gtc-ecm.web.boeing.com/",expectedHosts:["termbank.web.boeing.com","gtc-ecm.web.boeing.com"]}];async function Te(e){return(await chrome.storage.local.get(e))[e]}async function We(){return await Te(S.STORAGE_KEYS.ASSESSMENTS)||[]}async function Ke(){return await Te(S.STORAGE_KEYS.VALIDATIONS)||[]}async function ze(){return await Te(S.STORAGE_KEYS.REVIEWS)||[]}async function me(){return(await chrome.storage.local.get("failedAssessments")).failedAssessments||[]}function Xe(e,t){let n=[...e];if(t.search&&t.search.trim()){let s=t.search.trim(),o=s.toLowerCase();n=n.filter(i=>{let r=String(i.assetName||"");if(r.toLowerCase().includes(o))return!0;try{return new RegExp(s,"i").test(r)}catch{return!1}})}return t.fromDate&&(n=n.filter(s=>{let o=Je(s,t.dateFilterField);return!!o&&o>=t.fromDate})),t.toDate&&(n=n.filter(s=>{let o=Je(s,t.dateFilterField);return!!o&&o<=t.toDate})),t.assessmentStatus&&(n=n.filter(s=>{let o=pe(s);return!(t.assessmentStatus==="incomplete"&&!o||t.assessmentStatus==="completed"&&o)})),n}function pe(e){return!!(e.incompleteAssessmentId||e.hasIncomplete)}function Lt(e,t){return t==="dueOn"?e.dueOn||e.raw?.dueOn:e.surveyCompletedOn||e.raw?.surveyCompletedOn}function Je(e,t){let n=Lt(e,t);if(!n)return"";let o=String(n).match(/^\d{4}-\d{2}-\d{2}/);if(o)return o[0];let i=new Date(n);return Number.isNaN(i.getTime())?"":[i.getFullYear(),String(i.getMonth()+1).padStart(2,"0"),String(i.getDate()).padStart(2,"0")].join("-")}function Ze(e){return e.map(t=>t.assessmentId)}var xt=chrome.runtime.getURL("assets/encoded_data.txt");async function et(e){let t=Array.isArray(e)?e:[],n=await It(),s=n.worksheets[0],o=n.addWorksheet("All Assessments"),i=new Map;for(let l=0;l<t.length;l++){let d=t[l],c=tt(d),p=$t(c,l);i.set(c.assessmentId,p);let w=Mt(n,s,p);Ct(w,d,c)}Rt(o,t,i),n.removeWorksheet(s.id),n.calcProperties.fullCalcOnLoad=!0,n.calcProperties.calcMode="auto";let r=await n.xlsx.writeBuffer();_t(r,`Risk_Profiler_Quality_List_${Dt()}.xlsx`)}async function It(){let t=(await(await fetch(xt)).text()).trim(),n=Uint8Array.from(atob(t),o=>o.charCodeAt(0)),s=new ExcelJS.Workbook;return await s.xlsx.load(n.buffer),s}function Rt(e,t,n){e.columns=[{header:"Open",key:"open",width:15},{header:"Assessment ID",key:"assessmentId",width:18},{header:"Application",key:"application",width:40},{header:"Asset ID",key:"assetId",width:15},{header:"Lifecycle",key:"lifecycle",width:20},{header:"Application Manager",key:"manager",width:30},{header:"Business System Owner",key:"owner",width:30},{header:"Survey Completed Date",key:"surveyCompletedDate",width:22},{header:"Attested Date",key:"attestedDate",width:22},{header:"Status",key:"status",width:15},{header:"Attested By",key:"attestedBy",width:30},{header:"Passed",key:"passed",width:12},{header:"Failed",key:"failed",width:12},{header:"N/A",key:"na",width:12},{header:"Score",key:"score",width:12},{header:"Error",key:"error",width:60}],t.forEach(s=>{let o=tt(s),i=s.summary||{},r=(s.results||[]).filter(E=>E.status==="FAIL").map(E=>`${E.id}: ${E.reason}`),l=(s.results||[]).filter(E=>E.reason==="Question identifier was not found in the survey questions.").map(E=>E.id),d=[s.error,l.length?`Missing Questions: ${l.join(", ")}`:"",r.length?r.join(" | "):""].filter(Boolean).join(" | "),c=e.addRow({open:"Open",assessmentId:o.assessmentId,application:o.assetName,assetId:o.assetId,lifecycle:o.lifeCycle,manager:o.appMgrName,owner:o.sysOwnerName,surveyCompletedDate:be(o.surveyCompletedOn),attestedDate:be(o.attestOn),status:o.hasIncomplete?"Incomplete":"Completed",attestedBy:o.attestName||"",passed:i.passed||0,failed:i.failed||0,na:i.na||0,score:i.score?`${i.score}%`:"",error:d}),p=n.get(o.assessmentId),w=c.getCell(1);w.value={text:"Open",hyperlink:`#'${p}'!A1`},w.font={color:{argb:"FF0563C1"},underline:!0}}),e.getRow(1).font={bold:!0}}function Ct(e,t,n){e.getCell("C2").value=n.assetName||"",e.getCell("C3").value=n.assetId||"",e.getCell("C4").value=n.appMgrName||"",e.getCell("C5").value=be(new Date);let s=Ot(e);(t.results||[]).forEach(o=>{let i=s[String(o.id).toUpperCase()];if(!i)return;let r=e.getCell(`A${i}`);r.value=kt(o.status);let l=String(o.status||"").toUpperCase();l==="PASS"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF00A300"}},r.font={color:{argb:"ff000000"},bold:!0}):l==="FAIL"?(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFF0000"}},r.font={color:{argb:"ff000000"},bold:!0}):l==="NA"&&(r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFD9D9D9"}},r.font={color:{argb:"ff000000"},italic:!0}),e.getCell(`D${i}`).value=o.reason||""})}function Ot(e){let t={};return e.eachRow((n,s)=>{let o=String(n.getCell(2).value||"").trim().toUpperCase();/^RP\d+$/.test(o)&&(t[o]=s)}),t}function Mt(e,t,n){let s=e.addWorksheet(n);return t.properties&&(s.properties=JSON.parse(JSON.stringify(t.properties))),t.pageSetup&&(s.pageSetup=JSON.parse(JSON.stringify(t.pageSetup))),t.views&&(s.views=JSON.parse(JSON.stringify(t.views))),t.columns.forEach((o,i)=>{let r=s.getColumn(i+1);r.width=o.width,r.hidden=o.hidden,r.outlineLevel=o.outlineLevel}),t.eachRow({includeEmpty:!0},(o,i)=>{let r=s.getRow(i);r.height=o.height,r.hidden=o.hidden,r.outlineLevel=o.outlineLevel,o.eachCell({includeEmpty:!0},(l,d)=>{let c=r.getCell(d);if(typeof l.value=="object"&&l.value!==null)try{c.value=JSON.parse(JSON.stringify(l.value))}catch{c.value=l.text||""}else c.value=l.value;try{c.style=JSON.parse(JSON.stringify(l.style||{}))}catch{c.style={}}if(l.alignment)try{c.alignment=JSON.parse(JSON.stringify(l.alignment))}catch{}if(l.font)try{c.font=JSON.parse(JSON.stringify(l.font))}catch{}if(l.border)try{c.border=JSON.parse(JSON.stringify(l.border))}catch{}if(l.fill)try{c.fill=JSON.parse(JSON.stringify(l.fill))}catch{}if(l.numFmt&&(c.numFmt=l.numFmt),l.protection)try{c.protection=JSON.parse(JSON.stringify(l.protection))}catch{}})}),t.model?.merges&&t.model.merges.forEach(o=>{try{s.mergeCells(o)}catch{}}),s}function kt(e){switch(String(e||"").toUpperCase()){case"PASS":return"Yes";case"FAIL":return"No";case"NA":return"N/A";default:return""}}function tt(e){return{...e.assessment||{},assessmentId:e.assessmentId,assetName:e.assetName,...e.assessment||{}}}function $t(e,t){return(e.assetName||`Assessment ${t+1}`).replace(/[\\/?*[\]:]/g," ").trim().slice(0,31)}function be(e){if(!e)return"";try{return new Date(e).toLocaleDateString()}catch{return e}}function Dt(){let e=new Date,t=n=>String(n).padStart(2,"0");return`${e.getFullYear()}${t(e.getMonth()+1)}${t(e.getDate())}_${t(e.getHours())}${t(e.getMinutes())}${t(e.getSeconds())}`}function _t(e,t){let n=new Blob([e],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),s=URL.createObjectURL(n),o=document.createElement("a");o.href=s,o.download=t,o.click(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}var Ie="http://schemas.openxmlformats.org/wordprocessingml/2006/main",Bt="http://schemas.microsoft.com/office/word/2010/wordml",Pt="http://schemas.openxmlformats.org/markup-compatibility/2006",Ft=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`,Ut=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,Ht=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,qt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${Ie}">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
            <w:sz w:val="22"/>
            <w:szCs w:val="22"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="1F2937"/>
            <w:sz w:val="32"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="315FD6"/>
            <w:sz w:val="26"/>
        </w:rPr>
    </w:style>
</w:styles>`,Vt=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${Ie}">
    <w:updateFields w:val="true"/>
</w:settings>`,nt=new TextEncoder,Qt=tn();async function st(e){let t=new Blob([Gt(e)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),n=URL.createObjectURL(t),s=document.createElement("a");s.href=n,s.download=`${an(e?.assetName||"application")}_RISK-PRofiler_review_notes.docx`,s.click(),URL.revokeObjectURL(n)}function Gt(e){return en([{name:"[Content_Types].xml",content:Ft},{name:"_rels/.rels",content:Ut},{name:"word/document.xml",content:jt(e)},{name:"word/_rels/document.xml.rels",content:Ht},{name:"word/styles.xml",content:qt},{name:"word/settings.xml",content:Vt}])}function jt(e){let t=e?.contacts||[],n=[x([T(`${e?.assetName||"Application"} Risk Profiler Review Notes`,{bold:!0})],{style:"Title",spacingAfter:260}),x([T("Application Details",{bold:!0})],{style:"Heading1"}),Wt([["Application Name",e?.assetName||"N/A"],["Due Date",Ne(e?.dueOn)||"N/A"],["Survey Completed On (Last)",Ne(e?.surveyCompletedOn)||"N/A"],["Review Assessment Date",Ne(e?.reviewedAt)||"N/A"]]),x([T("Contacts",{bold:!0})],{style:"Heading1",spacingBefore:180}),Yt(t),x([T("Review Output",{bold:!0})],{style:"Heading1",spacingBefore:220}),Kt(e?.workQueue||[])].join("");return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${Ie}"
    xmlns:w14="${Bt}"
    xmlns:mc="${Pt}"
    mc:Ignorable="w14">
    <w:body>
        ${n}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`}function Yt(e){if(e.length===0)return x([T("No Application Manager or Business System Manager details were found.")]);let t=[fe([O("Contact Type",{bold:!0,fill:"E8EEFC"}),O("Name",{bold:!0,fill:"E8EEFC"}),O("BEMS ID",{bold:!0,fill:"E8EEFC"}),O("Email",{bold:!0,fill:"E8EEFC"})]),...e.map(n=>fe([O(n.contactType||"N/A"),O(n.associatedTo||"N/A"),O(n.bemsId||"N/A"),O(n.email||"N/A")]))];return Re(t)}function Wt(e){return Re(e.map(([t,n])=>fe([O(t,{bold:!0,fill:"F3F4F6"}),O(n)])))}function Kt(e){return e.length===0?x([T("No reachable unanswered work queue items were found.")]):e.map((t,n)=>[t.status?x([T(t.status,{bold:!0,color:"315FD6"})],{spacingBefore:n===0?80:180,spacingAfter:80}):"",Jt(t.questionGroup||"N/A",t.questionId||"N/A"),Ae("Question",t.question||"N/A"),Ae("Answer Type",t.answerType||"N/A"),t.asaNotes?Ae("ASA Notes",t.asaNotes,{fill:"FFF7CC"}):"",x([T("Options",{bold:!0})]),...zt(t.options||[]),Zt()].join("")).join("")}function zt(e){return(e.length?e:[{index:1,internalValue:"<no options>"}]).map(n=>x([Xt(),T(` ${n.internalValue||n.displayValue||"<no options>"}`)],{indentLeft:360,spacingAfter:70}))}function Jt(e,t){return Re([fe([Le([T("Category: ",{bold:!0}),T(e)]),Le([T("Question ID: ",{bold:!0}),T(t)],{align:"right"})])],{noBorders:!0})}function Ae(e,t,n={}){return x([T(`${e}: `,{bold:!0}),T(t)],n)}function Xt(){return`
        <w:sdt>
            <w:sdtPr>
                <w:id w:val="${Math.floor(Math.random()*1e9)}"/>
                <w14:checkbox>
                    <w14:checked w14:val="0"/>
                    <w14:checkedState w14:val="2612" w14:font="Segoe UI Symbol"/>
                    <w14:uncheckedState w14:val="2610" w14:font="Segoe UI Symbol"/>
                </w14:checkbox>
            </w:sdtPr>
            <w:sdtContent>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>\u2610</w:t>
                </w:r>
            </w:sdtContent>
        </w:sdt>`}function Zt(){return x([],{borderBottom:!0,spacingBefore:80,spacingAfter:140})}function x(e,t={}){let n=[];return t.style&&n.push(`<w:pStyle w:val="${xe(t.style)}"/>`),t.align&&n.push(`<w:jc w:val="${t.align}"/>`),(t.spacingBefore||t.spacingAfter)&&n.push(`<w:spacing w:before="${t.spacingBefore||0}" w:after="${t.spacingAfter||0}"/>`),t.indentLeft&&n.push(`<w:ind w:left="${t.indentLeft}"/>`),t.borderBottom&&n.push('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>'),t.fill&&n.push(`<w:shd w:fill="${xe(t.fill)}"/>`),`<w:p>${n.length?`<w:pPr>${n.join("")}</w:pPr>`:""}${e.join("")}</w:p>`}function T(e,t={}){let n=[];return t.bold&&n.push("<w:b/>"),t.color&&n.push(`<w:color w:val="${t.color}"/>`),`<w:r>${n.length?`<w:rPr>${n.join("")}</w:rPr>`:""}<w:t xml:space="preserve">${xe(e)}</w:t></w:r>`}function Re(e,t={}){return`<w:tbl>
        <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            ${t.noBorders?`<w:tblBorders>
                <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
            </w:tblBorders>`:`<w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideH w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideV w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
            </w:tblBorders>`}
        </w:tblPr>
        ${e.join("")}
    </w:tbl>`}function fe(e){return`<w:tr>${e.join("")}</w:tr>`}function O(e,t={}){return Le([T(e||"",{bold:t.bold})],t)}function Le(e,t={}){let n=['<w:tcW w:w="2500" w:type="pct"/>','<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>'];return t.fill&&n.push(`<w:shd w:fill="${t.fill}"/>`),`<w:tc><w:tcPr>${n.join("")}</w:tcPr>${x(e,{align:t.align})}</w:tc>`}function en(e){let t=0,n=[],s=[];e.forEach(r=>{let l=nt.encode(r.name),d=nt.encode(r.content),c=nn(d);n.push(A(67324752),f(20),f(0),f(0),f(0),f(0),A(c),A(d.length),A(d.length),f(l.length),f(0),l,d),s.push(A(33639248),f(20),f(20),f(0),f(0),f(0),f(0),A(c),A(d.length),A(d.length),f(l.length),f(0),f(0),f(0),f(0),A(0),A(t),l),t+=30+l.length+d.length});let o=at(s),i=[A(101010256),f(0),f(0),f(e.length),f(e.length),A(o),A(t),f(0)];return sn([...n,...s,...i])}function tn(){let e=[];for(let t=0;t<256;t+=1){let n=t;for(let s=0;s<8;s+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e}function nn(e){let t=4294967295;for(let n of e)t=Qt[(t^n)&255]^t>>>8;return(t^4294967295)>>>0}function f(e){let t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e,!0),t}function A(e){let t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function sn(e){let t=at(e),n=new Uint8Array(t),s=0;return e.forEach(o=>{n.set(o,s),s+=o.length}),n}function at(e){return e.reduce((t,n)=>t+n.length,0)}function xe(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function Ne(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function an(e){return String(e).trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").replace(/^_+|_+$/g,"")||"application"}function Ce(e,t){let n=e;return Object.entries(t).forEach(([s,o])=>{n=n.replace(`{${s}}`,o)}),n}var ae=new Map,on="https://esats.web.boeing.com",rn="service-gateway.tas-phx.apps.boeing.com",ln="https://gtc-ecm.web.boeing.com",cn="termbank.web.boeing.com",dn={retries:3,retryDelay:1e3,useCache:!0};function un(e){return new Promise(t=>setTimeout(t,e))}function mn(e){try{return new URL(e).hostname===rn}catch{return!1}}function pn(e){try{return new URL(e).hostname===cn}catch{return!1}}function fn(){return typeof chrome<"u"&&chrome.tabs&&chrome.scripting}function wn(e){return new Promise(t=>{chrome.tabs.query(e,t)})}async function gn(e){let t=await wn({url:`${e}/*`});return t.find(n=>n.id&&n.status==="complete")||t.find(n=>n.id)}function vn(e){return new Promise((t,n)=>{chrome.scripting.executeScript(e,s=>{let o=chrome.runtime.lastError;if(o){n(new Error(o.message));return}t(s)})})}async function ot(e,{pageOrigin:t,label:n,useBearerToken:s}){if(!fn())throw new Error(`${n} requests require the Chrome scripting permission.`);let o=await gn(t);if(!o)throw new Error(`Open ${n} in this browser and sign in before running ${n} validation requests.`);let r=(await vn({target:{tabId:o.id},world:"MAIN",args:[e,s,t],func:async(l,d,c)=>{function p(I){if(!I)return null;let b=String(I).trim();b.startsWith("Bearer ")&&(b=b.slice(7).trim());try{let m=JSON.parse(b);typeof m=="string"?b=m.trim():m&&typeof m=="object"&&(b=m.esatsToken||m.access_token||m.token||m.value||b)}catch{}return b||null}let w=d?p(localStorage.getItem("esatsToken")):null,E={Accept:"application/json, text/plain, */*"};d&&w&&(E.Authorization=`Bearer ${w}`);try{let m=null,G=null;for(let W=1;W<=3;W++){try{if(m=await fetch(l,{method:"GET",headers:E,credentials:"omit",cache:"no-store",referrer:`${c}/`,referrerPolicy:"strict-origin-when-cross-origin"}),m.ok)break;G=new Error(`${m.status} ${m.statusText}`)}catch(R){G=R}W<3&&await new Promise(R=>setTimeout(R,1e3))}if(!m||!m.ok)throw G||new Error("Request failed");let j=await m.text(),Y=null;if(j)try{Y=JSON.parse(j)}catch{Y=j}return{ok:m.ok,status:m.status,statusText:m.statusText,url:m.url,hasAuthorization:d?!!w:!0,data:Y}}catch(I){return console.info("Trusted page request failed.",{method:"GET",errorName:I?.name||"Error"}),{ok:!1,status:0,statusText:I.message||"Request failed",hasAuthorization:d?!!w:!0,error:I.message}}}}))?.[0]?.result;if(!r)throw new Error(`${n} request did not return a response.`);if(!r.ok){let l=r.hasAuthorization?"":" No ESATS bearer token was found in the ESATS tab.";throw new Error(`${n} request failed: ${r.status} ${r.statusText}.${l}`)}return r.data}async function hn(e){return ot(e,{pageOrigin:on,label:"ESATS",useBearerToken:!0})}async function Sn(e){return ot(e,{pageOrigin:ln,label:"GTC",useBearerToken:!1})}async function we(e,t={}){let n={...dn,...t};if(n.useCache&&ae.has(e))return ae.get(e);let s;for(let o=1;o<=n.retries;o++)try{if(mn(e)){let l=await hn(e);return n.useCache&&ae.set(e,l),l}if(pn(e)){let l=await Sn(e);return n.useCache&&ae.set(e,l),l}let i=await fetch(e,{credentials:"include",headers:{Accept:"application/json, text/plain, */*"},cache:"no-store"});if(!i.ok)throw new Error(`${i.status} ${i.statusText}`);let r=await i.json();return n.useCache&&ae.set(e,r),r}catch(i){s=i,o<n.retries&&await un(n.retryDelay)}throw s}async function Oe(e){if(!e)return[];let t=Ce(se.SURVEY_TEMPLATE_QUESTIONS,{id:e});return we(t)}async function Me(e){if(!e)return null;let t=Ce(se.SURVEY_TEMPLATE_DETAIL,{id:e});return we(t)}async function rt(){return we(se.SURVEY_TEMPLATES_RP_APP,{useCache:!1})}function it(e){let t=new Map;for(let n of e)n.alternateQuestionId&&t.set(n.alternateQuestionId,n);return t}async function lt(e,t){if(!e||!t)throw new Error("Both survey template IDs are required.");if(Number(e)===Number(t))return{metadata:{fromId:Number(e),toId:Number(t)},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};let[n,s,o,i]=await Promise.all([Me(e),Oe(e),Me(t),Oe(t)]);if(!n||!o)throw new Error("Unable to load one or both survey template details.");let r=it(s||[]),l=it(i||[]),d=new Set([...r.keys(),...l.keys()]),c=Array.from(d).sort(),p={metadata:{fromId:Number(e),fromVersionNumber:n.versionNumber,fromUpdatedOn:n.updatedOn,fromReleasedOn:n.releasedOn,toId:Number(t),toVersionNumber:o.versionNumber,toUpdatedOn:o.updatedOn,toReleasedOn:o.releasedOn},newQuestions:[],removedQuestions:[],modifiedQuestions:[]};for(let w of c)if(!r.has(w))p.newQuestions.push({alternateQuestionId:w,questionText:l.get(w).questionText});else if(!l.has(w))p.removedQuestions.push({alternateQuestionId:w,questionText:r.get(w).questionText});else{let E=r.get(w),I=l.get(w),b=!1,m={alternateQuestionId:w};E.questionText!==I.questionText&&(m.textChanged={old:E.questionText,new:I.questionText},b=!0);let G=new Set((E.options||[]).map(R=>R.displayValue)),j=new Set((I.options||[]).map(R=>R.displayValue)),Y=[...j].filter(R=>!G.has(R)),W=[...G].filter(R=>!j.has(R));(Y.length>0||W.length>0)&&(m.optionsChanged={added:Y,removed:W},b=!0),b&&p.modifiedQuestions.push(m)}return p}var U=[],D=[],$e=[],Z="",k=[],N=[],L=[],ee=!1,re=!1,M="validation",u=null,F={},X={},C=[],v=null,y=null,oe=0,ie=z.INITIAL,He="{{ASSET_NAME}} Risk Profiler Review",h={enabled:!1,emailTemplateEnabled:!1,emailTemplateSubject:He,emailTemplateHtml:""},ct="pluginLayoutMode",pt="popup",a=e=>document.getElementById(e);document.addEventListener("DOMContentLoaded",yn);async function yn(){document.body.classList.toggle("side-pane",new URLSearchParams(location.search).get("view")==="side-pane"),await En(),await Tn(),await ft(),await os(),await Gn(),$n(),await hs(),bt(),Wn(),ys(),Ns()}async function ft(){U=await We(),D=[...U],Mn(),ue()}async function En(){let t=(await chrome.storage.local.get(ct))[ct]==="side-pane"?"side-pane":pt,n=document.querySelector(`input[name="pluginLayout"][value="${t}"]`);n&&(n.checked=!0)}async function Tn(){let e=a("asaSettingsSection");if(!K){e?.classList.add("hidden");return}e?.classList.remove("hidden");let n=(await chrome.storage.local.get(S.STORAGE_KEYS.ASA_SETTINGS))[S.STORAGE_KEYS.ASA_SETTINGS]||{};h={enabled:n.enabled===!0,emailTemplateEnabled:n.emailTemplateEnabled===!0,emailTemplateSubject:typeof n.emailTemplateSubject=="string"?qe(n.emailTemplateSubject):He,emailTemplateHtml:typeof n.emailTemplateHtml=="string"?Se(n.emailTemplateHtml):""},ve()}function ve(){if(!K)return;let e=a("asaModeToggle"),t=a("emailTemplateToggle"),n=a("emailTemplateEditor"),s=a("emailTemplateSubject");e&&(e.checked=h.enabled),t&&(t.checked=h.emailTemplateEnabled),s&&s.value!==h.emailTemplateSubject&&(s.value=h.emailTemplateSubject),n&&n.innerHTML!==h.emailTemplateHtml&&(n.innerHTML=h.emailTemplateHtml),a("emailTemplateSettings")?.classList.toggle("hidden",!h.enabled),a("emailTemplateEditorSection")?.classList.toggle("hidden",!h.enabled||!h.emailTemplateEnabled)}function De(){return K?{enabled:a("asaModeToggle")?.checked===!0,emailTemplateEnabled:a("emailTemplateToggle")?.checked===!0,emailTemplateSubject:qe(a("emailTemplateSubject")?.value||""),emailTemplateHtml:Se(a("emailTemplateEditor")?.innerHTML||"")}:h}function qe(e){return String(e||"").replace(/[\r\n\t]+/g," ").trim()}function Se(e){let t=document.createElement("template");t.innerHTML=String(e||"");let n=new Set(["A","ADDRESS","B","BLOCKQUOTE","CENTER","CODE","DEL","STRONG","I","EM","FONT","H1","H2","H3","H4","H5","H6","HR","IMG","INS","MARK","PRE","S","SMALL","SPAN","STRIKE","SUB","SUP","U","BR","DIV","P","UL","OL","LI","TABLE","TBODY","TD","TFOOT","TH","THEAD","TR"]),s=new Set(["APPLET","AUDIO","BASE","EMBED","FORM","IFRAME","LINK","META","OBJECT","SCRIPT","STYLE","SVG","TEMPLATE","VIDEO"]);return[...t.content.querySelectorAll("*")].forEach(o=>{if(!n.has(o.tagName)){s.has(o.tagName)?o.remove():o.replaceWith(...o.childNodes);return}[...o.attributes].forEach(i=>{let r=i.name.toLowerCase();if(r==="style"){An(o);return}Nn(o,r,i.value)||o.removeAttribute(i.name)}),o.tagName==="A"&&o.getAttribute("target")==="_blank"&&o.setAttribute("rel","noopener noreferrer")}),t.innerHTML}var bn=/^(?:background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-(?:color|style|width|radius))?|border-collapse|border-spacing|box-sizing|color|display|float|font(?:-(?:family|size|style|variant|weight))?|height|letter-spacing|line-height|list-style(?:-(?:position|type))?|margin(?:-(?:top|right|bottom|left))?|max-height|max-width|min-height|min-width|object-fit|overflow-wrap|padding(?:-(?:top|right|bottom|left))?|table-layout|text-align|text-decoration(?:-line)?|text-indent|text-transform|vertical-align|white-space|width|word-break|word-spacing)$/;function An(e){[...e.style].forEach(n=>{let s=e.style.getPropertyValue(n);(!bn.test(n.toLowerCase())||/(?:expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding)/i.test(s))&&e.style.removeProperty(n)}),e.style.length||e.removeAttribute("style")}function Nn(e,t,n){if(t.startsWith("on")||t==="srcset")return!1;if(["dir","lang","title"].includes(t))return!0;let s=e.tagName;return s==="IMG"&&["alt","height","width"].includes(t)?!0:s==="IMG"&&t==="src"?wt(n):s==="A"&&t==="href"?/^(?:https?:|mailto:|tel:)/i.test(String(n||"").trim()):s==="A"&&t==="target"?["_blank","_self"].includes(n):s==="A"&&t==="rel"?!0:{TABLE:new Set(["align","bgcolor","border","cellpadding","cellspacing","height","width"]),TD:new Set(["align","bgcolor","colspan","height","rowspan","valign","width"]),TH:new Set(["align","bgcolor","colspan","height","rowspan","scope","valign","width"]),TR:new Set(["align","bgcolor","height","valign"]),FONT:new Set(["color","face","size"])}[s]?.has(t)===!0}function wt(e){let t=String(e||"").trim();return/^https?:\/\//i.test(t)||/^cid:[^\s<>]+$/i.test(t)||/^data:image\/(?:avif|bmp|gif|jpe?g|png|webp|x-icon|x-png);base64,/i.test(t)}function Ln(e){return new Promise((t,n)=>{let s=new FileReader;s.addEventListener("load",()=>t(String(s.result||""))),s.addEventListener("error",()=>n(s.error||new Error("Unable to read the pasted image."))),s.readAsDataURL(e)})}async function xn(e){let t=e.clipboardData;if(!t)return;let n=t.getData("text/html"),s=[...t.items].filter(p=>p.kind==="file"&&p.type.startsWith("image/")).map(p=>p.getAsFile()).filter(Boolean);if(!n&&s.length===0)return;let o=e.currentTarget,i=window.getSelection(),r=i?.rangeCount&&o?.contains(i.getRangeAt(0).commonAncestorContainer)?i.getRangeAt(0).cloneRange():null;e.preventDefault();let l=await Promise.all(s.map(Ln)),d=document.createElement("template");d.innerHTML=n||l.map(p=>`<img src="${p}" alt="Pasted image">`).join("");let c=0;d.content.querySelectorAll("img").forEach(p=>{!wt(p.getAttribute("src"))&&l[c]&&p.setAttribute("src",l[c++])}),r&&i&&(i.removeAllRanges(),i.addRange(r)),document.execCommand("insertHTML",!1,Se(d.innerHTML))}function In(){let e=a("templateVariableSelect")?.value||"",t=a("templatePlaceholderDisplay"),n=a("copyTemplatePlaceholderBtn");t&&(t.textContent=e),n?.classList.toggle("hidden",!e)}async function Rn(){let e=a("templateVariableSelect")?.value||"";if(!e)return;try{await navigator.clipboard.writeText(e)}catch{let s=document.createElement("textarea");s.value=e,document.body.appendChild(s),s.select(),document.execCommand("copy"),s.remove()}let t=a("copyTemplatePlaceholderBtn");if(!t)return;let n=t.textContent;t.textContent="Copied",window.setTimeout(()=>{t.textContent=n},900)}function Cn(){a("layoutSettingsStatus").textContent="",ve(),a("layoutSettingsModal")?.classList.remove("hidden")}function _e(){a("layoutSettingsModal")?.classList.add("hidden")}async function On(){let e=document.querySelector('input[name="pluginLayout"]:checked'),t=a("saveLayoutSettingsBtn"),n=a("layoutSettingsStatus");if(!(!e||!t||!n)){t.disabled=!0,n.textContent="Applying layout\u2026";try{let s=e.value==="side-pane"?"side-pane":pt,o=await chrome.runtime.sendMessage({action:"SET_PLUGIN_LAYOUT",mode:s});if(!o?.success)throw new Error(o?.error||"Unable to update the plugin layout.");if(K&&(h=De(),await chrome.storage.local.set({[S.STORAGE_KEYS.ASA_SETTINGS]:h})),s==="side-pane"&&!document.body.classList.contains("side-pane")){let i=await chrome.windows.getCurrent();await chrome.sidePanel.open({windowId:i.id})}n.textContent=s==="side-pane"?"Side-pane mode is active.":"Pop-up mode is active.",le(L),window.setTimeout(_e,700)}catch(s){n.textContent=s.message}finally{t.disabled=!1}}}function Mn(){$e=[...new Set(U.map(e=>e.appMgrName))].filter(Boolean).sort(),ye()}function kn(e){let t=a("ownerOptions");if(!t)return;t.innerHTML="";let n=document.createElement("button");n.type="button",n.className="manager-option",n.textContent="All Application Managers",n.addEventListener("click",()=>{Z="",a("ownerSearchInput").value="",he(),$()}),t.appendChild(n),e.forEach(s=>{let o=document.createElement("button");o.type="button",o.className="manager-option",o.textContent=s,o.addEventListener("click",()=>{Z=s,a("ownerSearchInput").value=s,he(),$()}),t.appendChild(o)})}function gt(){let e=a("ownerSearchInput")?.value?.trim()||"";if(!e)return null;try{return new RegExp(e,"i")}catch{return null}}function ye(){let e=gt(),t=e?$e.filter(n=>e.test(n)):$e;kn(t)}function dt(){ye(),a("ownerOptions")?.classList.remove("hidden")}function he(){a("ownerOptions")?.classList.add("hidden")}function $n(){a("searchInput")?.addEventListener("input",$),a("regexMode")?.addEventListener("change",$),a("fromDate")?.addEventListener("change",$),a("toDate")?.addEventListener("change",$),a("dateFilterField")?.addEventListener("change",$),a("assessmentStatusFilter")?.addEventListener("change",$),a("ownerSearchInput")?.addEventListener("focus",dt),a("ownerSearchInput")?.addEventListener("input",()=>{Z="",ye(),dt(),$()}),a("ownerSearchInput")?.addEventListener("keydown",e=>{e.key==="Escape"&&he()}),document.addEventListener("click",e=>{e.target.closest(".manager-search-select")||he()}),a("clearFiltersBtn")?.addEventListener("click",_n),a("refreshBtn")?.addEventListener("click",qn),a("checkPrereqBtn")?.addEventListener("click",bt),a("selectAllBtn")?.addEventListener("click",Un),a("clearSelectionBtn")?.addEventListener("click",Hn),a("validateBtn")?.addEventListener("click",Vn),a("layoutSettingsBtn")?.addEventListener("click",Cn),a("closeLayoutSettingsBtn")?.addEventListener("click",_e),a("layoutSettingsModal")?.addEventListener("click",e=>{e.target.id==="layoutSettingsModal"&&_e()}),a("saveLayoutSettingsBtn")?.addEventListener("click",On),a("asaModeToggle")?.addEventListener("change",()=>{h=De(),ve()}),a("emailTemplateToggle")?.addEventListener("change",()=>{h=De(),ve()}),document.querySelectorAll("[data-rich-command]").forEach(e=>{e.addEventListener("click",()=>{a("emailTemplateEditor")?.focus(),document.execCommand(e.dataset.richCommand,!1)})}),a("emailTemplateEditor")?.addEventListener("paste",e=>{xn(e).catch(()=>{window.alert("The pasted image could not be added to the email template.")})}),a("templateVariableSelect")?.addEventListener("change",In),a("copyTemplatePlaceholderBtn")?.addEventListener("click",Rn),a("reviewBtn")?.addEventListener("click",Qn),a("reviewSettingsBtn")?.addEventListener("click",jn),a("scrollToggleBtn")?.addEventListener("click",Dn),window.addEventListener("scroll",ge,{passive:!0}),window.addEventListener("resize",ge),typeof ResizeObserver<"u"&&new ResizeObserver(ge).observe(document.body),a("closeReviewSettingsModalBtn")?.addEventListener("click",Be),a("reviewSettingsModal")?.addEventListener("click",e=>{e.target===a("reviewSettingsModal")&&Be()}),a("saveReviewSettingsBtn")?.addEventListener("click",Yn),a("cancelBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_VALIDATION"})}),a("cancelReviewBtn")?.addEventListener("click",async()=>{await chrome.runtime.sendMessage({action:"STOP_REVIEW"})}),a("retryFailedBtn")?.addEventListener("click",bs),a("clearResultsBtn")?.addEventListener("click",Es),a("clearReviewResultsBtn")?.addEventListener("click",Ts),a("exportBtn")?.addEventListener("click",As),a("validationTabBtn")?.addEventListener("click",()=>H("validation")),a("reviewTabBtn")?.addEventListener("click",()=>H("review")),a("closeReviewNotesModalBtn")?.addEventListener("click",Pe),a("reviewNotesModal")?.addEventListener("click",e=>{e.target===a("reviewNotesModal")&&Pe()}),a("copyReviewNotesBtn")?.addEventListener("click",gs),a("selectAllReviewNotesBtn")?.addEventListener("click",us),a("downloadReviewNotesBtn")?.addEventListener("click",es),vs(),ge()}function Ve(){let e=window.scrollY||document.documentElement.scrollTop||document.body.scrollTop||0,t=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),n=window.innerHeight||document.documentElement.clientHeight,s=Math.max(0,t-n);return{scrollTop:e,maxScroll:s}}function vt(){let{scrollTop:e,maxScroll:t}=Ve();return t<=0?!1:e>=t/2}function ge(){let e=a("scrollToggleBtn");if(!e)return;let{maxScroll:t}=Ve(),n=vt();e.classList.toggle("scroll-up",n),e.title=n?"Scroll to top":"Scroll to bottom",e.setAttribute("aria-label",e.title),e.disabled=t<=0}function Dn(){let{maxScroll:e}=Ve();window.scrollTo({top:vt()?0:e,behavior:"smooth"})}function $(){let e={search:a("searchInput")?.value||"",fromDate:a("fromDate")?.value||"",toDate:a("toDate")?.value||"",dateFilterField:a("dateFilterField")?.value||"surveyCompletedOn",assessmentStatus:a("assessmentStatusFilter")?.value||""};if(D=Xe(U,e),Z)D=D.filter(t=>t.appMgrName===Z);else{let t=gt();t&&(D=D.filter(n=>t.test(n.appMgrName||"")))}ue()}function _n(){a("searchInput").value="",a("fromDate").value="",a("toDate").value="",a("dateFilterField").value="surveyCompletedOn",a("assessmentStatusFilter").value="",a("ownerSearchInput").value="",Z="",ye(),D=[...U],ue()}function ue(){let e=a("assessmentList");e.innerHTML="",D.forEach(t=>{let n=Pn(t),s=document.createElement("div");s.className=`assessment-row ${n.className}`,s.innerHTML=`

                <input
                    type="checkbox"
                    class="assessment-checkbox"
                    data-id="${t.assessmentId}"
                    ${k.includes(t.assessmentId)?"checked":""}
                >

                <div class="assessment-meta">

                    <div class="asset-name">

                        ${t.assetName}

                        <span class="status-pill ${n.className}">
                            ${n.label}
                        </span>

                    </div>

                    <div class="asset-sub">

                        ID:
                        ${t.assessmentId}

                        \u2022

                        ${t.lifeCycle}

                        \u2022

                        ${t.appMgrName||"N/A"}

                    </div>

                    <div class="asset-sub date-info">
                        ${Bn(t)}
                    </div>

                    <div class="asset-sub status-detail">

                        ${n.detail}

                    </div>

                </div>

            `,e.appendChild(s)}),Fn(),ht()}function Bn(e){let t=P(e.dueOn||e.raw?.dueOn)||"N/A";if(pe(e))return`<strong>Incomplete initiated date:</strong> ${P(e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn)||"N/A"} \u2022 <strong>Due on:</strong> ${t}`;let n=P(e.surveyCompletedOn||e.raw?.surveyCompletedOn)||"N/A";return`<strong>Due on:</strong> ${t} \u2022 <strong>Survey Completed(Last):</strong> ${n}`}function Pn(e){if(pe(e)){let o=e.incompleteInitiatedByName||e.raw?.incompleteInitiatedByName||"N/A",i=e.incompleteInitiatedOn||e.raw?.incompleteInitiatedOn;return{label:"Incomplete",className:"status-incomplete",detail:`Incomplete mark \u2022 Initiated by ${o}${i?` \u2022 ${P(i)}`:""}`}}let n=e.attestName||e.raw?.attestName||"N/A",s=e.attestOn||e.raw?.attestOn;return{label:"Completed",className:"status-completed",detail:`Attested by ${n}${s?` \u2022 ${P(s)}`:""}`}}function P(e){if(!e)return"";let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"2-digit"})}function Fn(){document.querySelectorAll(".assessment-checkbox").forEach(e=>{e.addEventListener("change",t=>{let n=Number(t.target.dataset.id);t.target.checked?k.includes(n)||k.push(n):k=k.filter(s=>s!==n),ht()})})}function ht(){a("selectedCount").textContent=`${k.length} Selected`}function Un(){k=Ze(D),ue()}function Hn(){k=[],ue()}async function qn(){a("refreshBtn").disabled=!0;try{await chrome.runtime.sendMessage({action:"REFRESH_ASSESSMENTS"}),await ft()}finally{a("refreshBtn").disabled=!1}}async function Vn(){let e=U.filter(t=>k.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}ee=!1,H("validation"),a("progressContainer")?.classList.remove("hidden"),a("cancelBtn")?.classList.remove("hidden"),a("cancelReviewBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e})}async function Qn(){let e=U.filter(t=>k.includes(t.assessmentId));if(e.length===0){alert("Select at least one assessment.");return}re=!1,H("review"),a("progressContainer")?.classList.remove("hidden"),J({completed:0,total:e.length,current:"Starting review",startedAt:Date.now(),type:"review"}),a("cancelReviewBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),a("retryFailedBtn")?.classList.add("hidden"),a("reviewBtn").disabled=!0,await chrome.runtime.sendMessage({action:"START_REVIEW",assessments:e,reviewConfig:{mode:ie}})}async function Gn(){let t=(await chrome.storage.local.get(S.STORAGE_KEYS.REVIEW_MODE))[S.STORAGE_KEYS.REVIEW_MODE];ie=Object.values(z).includes(t)?t:z.INITIAL,St()}function St(){document.querySelectorAll("input[name='reviewMode']").forEach(e=>{e.checked=e.value===ie})}function jn(){St(),a("reviewSettingsModal")?.classList.remove("hidden")}function Be(){a("reviewSettingsModal")?.classList.add("hidden")}async function Yn(){let e=document.querySelector("input[name='reviewMode']:checked");ie=Object.values(z).includes(e?.value)?e.value:z.INITIAL,await chrome.storage.local.set({[S.STORAGE_KEYS.REVIEW_MODE]:ie}),Be()}function Wn(){setInterval(async()=>{let e=await chrome.storage.local.get(["validationProgress","validationComplete","validationResults","validationError","reviewProgress","reviewComplete","reviewResults","reviewError",S.STORAGE_KEYS.LAST_ACTION]),t=e[S.STORAGE_KEYS.LAST_ACTION]||M;t==="validation"&&e.validationProgress&&!e.validationComplete&&J(e.validationProgress,"validation"),e.validationComplete&&!ee&&(N=e.validationResults||[],Qe(N),ee=!0,H("validation"),a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden"),a("cancelBtn")?.classList.add("hidden"),J(e.validationProgress,"validation"),(await me()).length?a("retryFailedBtn")?.classList.remove("hidden"):a("retryFailedBtn")?.classList.add("hidden")),t==="review"&&e.reviewProgress&&!e.reviewComplete&&J(e.reviewProgress,"review"),e.reviewComplete&&!re&&(L=e.reviewResults||[],le(L),re=!0,H("review"),a("reviewBtn").disabled=!1,J(e.reviewProgress,"review"),a("cancelReviewBtn")?.classList.add("hidden"),a("clearReviewResultsBtn")?.classList.remove("hidden")),t==="validation"&&e.validationError&&!e.validationProgress&&(a("cancelBtn")?.classList.add("hidden"),a("progressText").textContent=e.validationError),e.reviewError&&(a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"))},1e3)}function J(e,t=M){if(!e||!e.total)return;let n=Math.round(e.completed/e.total*100),s=e.completedAt||Date.now(),o=e.startedAt||s,i=Math.max(0,s-o),r=e.completed>=e.total,l=!r&&e.completed>0?ke(Math.max(0,i/e.completed*(e.total-e.completed))):r?"Complete":"Calculating",d=t==="review"?"Review":"Validation",c=e.current&&!String(e.current).toLowerCase().includes("completed")?` \u2022 Current: ${e.current}`:"";a("progressText").textContent=r?`${d} complete: ${e.completed}/${e.total} processed \u2022 Time Elapsed: ${ke(i)} \u2022 Estimated Time: Complete`:`${d} in progress: ${e.completed}/${e.total} processed${c} \u2022 Time Elapsed: ${ke(i)} \u2022 Estimated Time: ${l}`,a("progressFill").style.width=`${n}%`}function ke(e){let t=Math.max(0,Math.round(e/1e3));if(t<60)return`${t}s`;let n=Math.floor(t/60),s=t%60;return`${n}m ${s}s`}function H(e){M=e==="review"?"review":"validation",a("validationTabBtn")?.classList.toggle("active",M==="validation"),a("reviewTabBtn")?.classList.toggle("active",M==="review"),a("resultsContainer")?.classList.toggle("hidden",M!=="validation"),a("reviewResultsContainer")?.classList.toggle("hidden",M!=="review"),q()}function q(){let e=N&&N.length>0,t=L&&L.length>0;a("exportBtn")?.classList.toggle("hidden",M!=="validation"||!e),a("clearResultsBtn")?.classList.toggle("hidden",M!=="validation"||!e),a("clearReviewResultsBtn")?.classList.toggle("hidden",M!=="review"||!t)}function Qe(e){let t=a("validationCardsContainer");if(t.innerHTML="",!e||e.length===0){q();return}e.forEach(n=>{let s=document.createElement("div");s.className="result-card";let o=n.results&&n.results.some(l=>l.reason==="Question identifier was not found in the survey questions."),i=n.summary?n.summary.score:null,r=i!==null&&i<90;s.innerHTML=`

                <div class="result-header">

                    <strong>

                        ${n.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${o?'<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>':""}
                        <span class="score-pill ${r?"score-low":""}">
                            ${n.summary?`${i}%`:"Error"}
                        </span>
                    </div>

                </div>

                <div class="result-meta">

                    ${n.error?n.error:`
                    PASS:
                    ${n.summary.passed}

                    |

                    FAIL:
                    ${n.summary.failed}

                    |

                    N/A:
                    ${n.summary.na}
                    `}

                </div>

                ${n.error?"":`
                <details>

                    <summary>
                        Checkpoints
                    </summary>

                    <div class="checkpoint-results">

                        <div class="checkpoint-results-header">
                            <span>Checkpoint Details</span>
                        </div>

                        ${n.results.map(l=>{let c=String(l.status||"").trim().toLowerCase(),p=c==="n/a"||c==="na"?"checkpoint-row-na":c==="pass"?"checkpoint-row-pass":c==="fail"?"checkpoint-row-fail":"",w=l.reason==="Question identifier was not found in the survey questions."?"rule-error-missing":"";return`

                            <div class="${[p,w].filter(Boolean).join(" ")}">

                                <strong>
                                    ${l.id}
                                </strong>

                                :

                                ${l.status}

                                <br>

                                <small>
                                    ${l.reason}
                                </small>

                            </div>

                            <hr>
                        `}).join("")}

                    </div>

                </details>
                    `}
            `,t.appendChild(s)}),q()}function le(e){let t=a("reviewCardsContainer");if(t.innerHTML="",!e||e.length===0){t.innerHTML='<div class="review-empty">No review results yet.</div>',q();return}e.forEach(n=>{let s=document.createElement("div"),o=n.status==="Incomplete"?"status-incomplete":"status-completed";s.className=`review-card ${o}`;let i=n.status==="Incomplete"?`
                        <div><strong>Incomplete Initiated On:</strong> ${n.incompleteInitiatedOnFormatted||"N/A"}</div>
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `:`
                        <div><strong>Due On:</strong> ${n.dueOnFormatted||"N/A"}</div>
                    `,r=K&&h.enabled&&h.emailTemplateEnabled&&!!h.emailTemplateHtml.replace(/<[^>]*>/g,"").trim();s.innerHTML=`
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${n.assetName||"Unknown Assessment"}
                        <span>Assessment ID: ${n.assessmentId||"N/A"}</span>
                    </div>
                    <span class="status-pill ${o}">
                        ${n.status||"Completed"}
                    </span>
                </div>
                <div class="review-card-meta">
                    ${i}
                    <div><strong>Review Items:</strong> ${n.workQueue?n.workQueue.length:0}</div>
                </div>
                ${n.error?`<div class="review-error">${n.error}</div>`:`<div class="review-card-actions">
                        <button
                            class="btn-secondary review-notes-btn"
                            data-id="${n.assessmentId}"
                        >
                            Review Notes
                        </button>
                        ${r?`<button
                                class="btn-secondary send-review-email-btn"
                                data-id="${n.assessmentId}"
                            >
                                Send Email
                            </button>`:""}
                    </div>`}
            `,t.appendChild(s)}),document.querySelectorAll(".review-notes-btn").forEach(n=>{n.addEventListener("click",()=>ts(n.dataset.id))}),document.querySelectorAll(".send-review-email-btn").forEach(n=>{n.addEventListener("click",()=>Xn(n.dataset.id))}),q()}function ut(e,t,{escapeHtml:n=!0}={}){let s=t.surveyTemplateId||(t.status==="Incomplete"?t.newSurveyTemplateId||t.reviewBasis?.newSurveyTemplateId:t.oldSurveyTemplateId||t.reviewBasis?.oldSurveyTemplateId)||"",o=r=>n?Kn(r):String(r??""),i={"{{ASSET_NAME}}":o(t.assetName),"{{ASSET_ID}}":o(t.assetId),"{{DUE_DATE}}":o(t.dueOnFormatted),"{{LAST_SURVEY_COMPLETED_ON}}":o(t.surveyCompletedOnFormatted),"{{INCOMPLETE_ASSESSMENT_ID}}":o(t.incompleteAssessmentId),"{{SURVEY_TEMPLATE_ID}}":o(s)};return Object.entries(i).reduce((r,[l,d])=>r.split(l).join(String(d)),String(e||""))}function Kn(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function zn(e){let t=document.createElement("div");return t.innerHTML=Se(e),t.querySelectorAll("br").forEach(n=>n.replaceWith(`
`)),t.querySelectorAll("li").forEach(n=>{n.prepend("\u2022 "),n.append(`
`)}),t.querySelectorAll("p, div").forEach(n=>n.append(`
`)),(t.textContent||"").replace(/\n{3,}/g,`

`).trim()}function Jn(e){let t=new Set(["ApplicationManager","BusinessSystemManager"]);return[...new Set((e.contacts||[]).filter(n=>t.has(n.roleName)).map(n=>String(n.email||"").trim()).filter(n=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n)))]}async function Xn(e){let t=L.find(l=>String(l.assessmentId)===String(e));if(!t)return;let n=Jn(t);if(n.length===0){window.alert("No valid Application Manager or Business System Manager email address was found for this assessment.");return}let s=ut(h.emailTemplateHtml,t),o=zn(s),i=qe(ut(h.emailTemplateSubject||He,t,{escapeHtml:!1}))||`${t.assetName||"Assessment"} Risk Profiler Review`;try{await Zn(s,o)}catch(l){window.alert(l?.message||"The formatted email could not be copied to the clipboard.");return}let r=`mailto:${n.map(l=>encodeURIComponent(l)).join(";")}?subject=${encodeURIComponent(i)}`;window.alert("The fully formatted email body has been copied. Paste it into the email draft."),await chrome.tabs.create({url:r})}async function Zn(e,t){let n=String(e||""),s=String(t||"");if(navigator.clipboard?.write&&typeof ClipboardItem<"u"){await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([n],{type:"text/html"}),"text/plain":new Blob([s],{type:"text/plain"})})]);return}let o=i=>{i.preventDefault(),i.clipboardData.setData("text/html",n),i.clipboardData.setData("text/plain",s)};if(document.addEventListener("copy",o,{once:!0}),!document.execCommand("copy"))throw new Error("The formatted email could not be copied to the clipboard.")}async function es(){if(!u||u.error)return;let e=yt(u);e.length!==0&&await st({...u,workQueue:e})}function ts(e){let t=L.find(n=>String(n.assessmentId)===String(e));!t||t.error||(u=t,a("reviewNotesTitle").textContent=t.assetName||"Review Notes",a("reviewNotesMeta").innerHTML=t.notesMetaHtml||"",ns(t),is(t),Ge(),a("reviewNotesModal")?.classList.remove("hidden"))}function Pe(){a("reviewNotesModal")?.classList.add("hidden"),u=null}function ns(e){let t=a("reviewBasisTooltip"),n=a("reviewBasisInfo");if(!t||!n)return;let s=e.reviewBasis||{},o=ss(s.reviewMode||e.reviewMode),i=s.assessmentBehavior||(e.status==="Incomplete"?"Incomplete assessment review uses the incomplete survey template.":"Completed assessment review uses the latest released survey template."),r=s.newAnswersUsed===!0?"Yes":"No";t.innerHTML=`
        <div><strong>Review mode:</strong> ${g(o)}</div>
        <div><strong>Behavior:</strong> ${g(i)}</div>
        <div><strong>Old survey template ID:</strong> ${g(s.oldSurveyTemplateId||e.oldSurveyTemplateId||"N/A")}</div>
        <div><strong>New survey template ID:</strong> ${g(s.newSurveyTemplateId||e.newSurveyTemplateId||"N/A")}</div>
        <div><strong>newAnswers used:</strong> ${g(r)}</div>
    `,n.classList.toggle("hidden",!1)}function ss(e){return e==="selectedAnswers"?"Review Based on Selected Answers":"Initial Review Mode"}function as(e){return`
        <span
            class="review-hover-info review-route-info"
            tabindex="0"
            aria-label="Reachability reason"
        >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="2"></circle>
                <circle cx="18" cy="18" r="2"></circle>
                <path d="M8 6h3a3 3 0 0 1 3 3v6"></path>
                <path d="m11 12 3 3 3-3"></path>
            </svg>
            <span class="review-hover-panel review-route-panel" role="tooltip">
                ${g(e)}
            </span>
        </span>
    `}async function os(){X=(await chrome.storage.local.get("reviewQuestionNotes")).reviewQuestionNotes||{}}async function rs(){await chrome.storage.local.set({reviewQuestionNotes:X})}function is(e){let t=Q(e);F[t]||(F[t]=(e.workQueue||[]).map((n,s)=>ne(n,s)))}function Ge(){let e=a("reviewNotesContent");if(!e||!u)return;let t=u.workQueue||[];if(t.length===0){e.innerHTML='<div class="review-output-empty">No reachable unanswered work queue items were found.</div>',Fe();return}let n=Q(u),s=new Set(F[n]||[]);e.innerHTML=t.map((o,i)=>ls(o,i,s.has(ne(o,i)))).join(""),cs(),Fe()}function ls(e,t,n){let s=ne(e,t),o=Et(u,e,t),i=ws(e),r=e.reachabilityReason?as(e.reachabilityReason):"";return`
        <section class="review-output-item" data-question-key="${g(s)}">
            <div class="review-question-toolbar">
                <label class="review-question-select">
                    <input
                        type="checkbox"
                        class="review-question-checkbox"
                        data-key="${g(s)}"
                        ${n?"checked":""}
                    >
                    <span>Select for download</span>
                </label>
                <div class="review-question-icon-actions">
                    ${r}
                    <button
                        type="button"
                        class="review-note-icon-btn"
                        data-key="${g(s)}"
                        title="ASA Notes"
                        aria-label="ASA Notes"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            ${e.status?`<div class="review-output-status">${g(e.status)}</div>`:""}
            <div class="review-output-id-row">
                <div><strong>Category:</strong> <span>${g(e.questionGroup||"N/A")}</span></div>
                <div><strong>Question ID:</strong> <span>${g(e.questionId||"N/A")}</span></div>
            </div>
            <div class="review-output-field">
                <strong>Question:</strong>
                <span>${g(e.question||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Answer Type:</strong>
                <span>${g(e.answerType||"N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Options:</strong>
                <ul>${i}</ul>
            </div>
            <div class="review-asa-note ${o?"":"hidden"}" data-note-preview="${g(s)}">
                <strong>ASA Notes:</strong>
                <span>${g(o)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${g(s)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${g(s)}"
                    placeholder="Write ASA notes for this question..."
                >${g(o)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${g(s)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `}function cs(){document.querySelectorAll(".review-question-checkbox").forEach(e=>{e.addEventListener("change",()=>{ds(e.dataset.key,e.checked),Fe()})}),document.querySelectorAll(".review-note-icon-btn").forEach(e=>{e.addEventListener("click",()=>ms(e.dataset.key))}),document.querySelectorAll(".review-note-save-btn").forEach(e=>{e.addEventListener("click",()=>ps(e.dataset.key))})}function ds(e,t){let n=Q(u),s=new Set(F[n]||[]);t?s.add(e):s.delete(e),F[n]=[...s]}function us(){if(!u)return;let e=Q(u),t=(u.workQueue||[]).map((s,o)=>ne(s,o)),n=F[e]||[];F[e]=n.length===t.length?[]:t,Ge()}function Fe(){let e=a("downloadReviewNotesBtn"),t=a("selectAllReviewNotesBtn");if(!e||!u)return;let n=(u.workQueue||[]).length,s=yt(u).length;e.textContent=`Download Review Notes (${s}/${n})`,e.disabled=s===0,t&&(t.textContent=s===n&&n>0?"Deselect All":"Select All",t.disabled=n===0)}function yt(e){let t=Q(e),n=new Set(F[t]||[]);return(e.workQueue||[]).map((s,o)=>({item:s,index:o,key:ne(s,o)})).filter(s=>n.has(s.key)).map(s=>({...s.item,asaNotes:Et(e,s.item,s.index)}))}function ms(e){document.querySelector(`[data-note-editor="${Tt(e)}"]`)?.classList.toggle("hidden")}async function ps(e){let n=document.querySelector(`[data-note-input="${Tt(e)}"]`)?.value.trim()||"",s=Q(u);X[s]||(X[s]={}),X[s][e]=n,await rs(),Ge()}function Et(e,t,n){let s=Q(e),o=ne(t,n);return X[s]?.[o]||""}function Q(e){return String(e?.assessmentId||"active")}function ne(e,t){return String(e?.surveyTemplateQuestionId||e?.questionId||`question-${t}`)}function fs(e){return e.internalValue||e.displayValue||"<no options>"}function ws(e){let t=(e.options||[]).length?e.options:[{internalValue:"<no options>"}],n=String(e.answerType||"").toLowerCase()==="multi select"?"checkbox":"radio",s=n==="checkbox"?"review-option-checkbox-square":"review-option-checkbox-circle";return t.map(o=>`
            <li class="review-option-row">
                <input
                    type="${n}"
                    class="review-option-checkbox ${s}"
                    disabled
                    aria-hidden="true"
                >
                <span>${g(fs(o))}</span>
            </li>
        `).join("")}function g(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Tt(e){return window.CSS?.escape?CSS.escape(e):String(e).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}async function gs(){if(!u)return;let t=`<!doctype html><html><head><meta charset="utf-8"></head><body>${u.reviewOutputCopyHtml||u.reviewOutputHtml||u.notesHtml||""}</body></html>`,n=u.reviewOutputText||u.notesText||a("reviewNotesContent")?.innerText||"",s=u.reviewOutputRtf||"";try{if(navigator.clipboard?.write&&window.ClipboardItem){let o={"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})};s&&(o["text/rtf"]=new Blob([s],{type:"text/rtf"}));try{await navigator.clipboard.write([new ClipboardItem(o)])}catch{await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([n],{type:"text/plain"})})])}}else await navigator.clipboard.writeText(n);a("copyReviewNotesBtn").textContent="Copied",setTimeout(()=>{a("copyReviewNotesBtn").textContent="Copy Review Output"},1200)}catch{await navigator.clipboard.writeText(n)}}function vs(){let e=new Map(Ye.map(t=>[t.id,t.openUrl||t.url]));document.querySelectorAll(".prereq-open-link").forEach(t=>{let n=e.get(t.dataset.site);n&&(t.href=n,t.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation(),chrome.tabs.create({url:n})}))})}async function hs(){let e=await chrome.storage.local.get("prerequisiteStatus");e.prerequisiteStatus&&At(e.prerequisiteStatus)}async function bt(){Ss();try{let e=await chrome.runtime.sendMessage({action:"CHECK_PREREQUISITES"});e?.success&&e.prerequisites&&At(e.prerequisites)}catch(e){a("prereqSummary").textContent=`Unable to check sessions: ${e.message}`,document.querySelectorAll(".prereq-item .signal").forEach(t=>{t.className="signal signal-fail"})}}function Ss(){a("prereqSummary").textContent="Checking Cairo, ESATS, and GTC sessions...",document.querySelectorAll(".prereq-item").forEach(e=>{let t=e.querySelector(".signal"),n=e.querySelector("small");t.className="signal signal-checking",n&&(n.textContent="Checking..."),e.title="Checking session..."})}function At(e){let t=e.checks||[];t.forEach(s=>{let o=document.querySelector(`.prereq-item[data-site="${s.id}"]`);if(!o)return;let i=o.querySelector(".signal"),r=o.querySelector("small");i.className=`signal ${s.passed?"signal-pass":"signal-fail"}`,r&&(r.textContent=s.passed?"Active":"Needs sign-in"),o.title=`${s.message}. Final URL: ${s.finalUrl}`});let n=t.filter(s=>!s.passed);if(n.length===0&&t.length>0){a("prereqSummary").textContent="All prerequisite sessions are active.";return}if(t.length===0){a("prereqSummary").textContent="Session checks have not run yet.";return}a("prereqSummary").textContent=`${n.length} session check${n.length===1?"":"s"} need attention. Open the help tooltip for sign-in steps.`}async function ys(){N=await Ke(),L=await ze(),N&&N.length&&(Qe(N),ee=!0,a("exportBtn")?.classList.remove("hidden"),a("clearResultsBtn")?.classList.remove("hidden")),L&&L.length?(le(L),re=!0):le([]);let e=await chrome.storage.local.get(S.STORAGE_KEYS.LAST_ACTION);H(e[S.STORAGE_KEYS.LAST_ACTION]==="review"?"review":"validation"),(await me()).length&&a("retryFailedBtn")?.classList.remove("hidden")}async function Es(){await chrome.runtime.sendMessage({action:"CLEAR_RESULTS"}),N=[],Qe(N),ee=!1,a("retryFailedBtn")?.classList.add("hidden"),a("cancelBtn")?.classList.add("hidden"),a("progressContainer")?.classList.add("hidden"),a("progressFill").style.width="0%",a("progressText").textContent="Starting...",q()}async function Ts(){await chrome.runtime.sendMessage({action:"CLEAR_REVIEW_RESULTS"}),L=[],le(L),re=!1,a("reviewBtn").disabled=!1,a("cancelReviewBtn")?.classList.add("hidden"),Pe(),q()}async function bs(){let e=await me();e.length!==0&&(ee=!1,a("progressContainer")?.classList.remove("hidden"),J({completed:0,total:e.length,current:"Starting validation",startedAt:Date.now()}),a("cancelBtn")?.classList.remove("hidden"),a("retryFailedBtn")?.classList.add("hidden"),await chrome.runtime.sendMessage({action:"START_VALIDATION",assessments:e}))}async function As(){!N||N.length===0||await et(N)}async function Ns(){let e=a("whatsNewIcon"),t=a("surveyDiffModal"),n=a("closeModalBtn"),s=a("refreshDiffBtn"),o=a("surveyFromSearch"),i=a("surveyToSearch"),r=a("runSurveyDiffBtn");!e||!t||!n||(e.addEventListener("click",async()=>{t.classList.remove("hidden");try{await xs()}catch(l){console.error("Survey diff modal restore error:",l),je(),B(null,"Unable to load survey versions.")}}),n.addEventListener("click",()=>{t.classList.add("hidden")}),t.addEventListener("click",l=>{l.target===t&&t.classList.add("hidden")}),s&&s.addEventListener("click",Is),o?.addEventListener("focus",()=>{_("from"),a("surveyFromOptions")?.classList.remove("hidden")}),o?.addEventListener("input",()=>{v=null,y=null,i&&(i.value="",i.disabled=!0,i.placeholder="Select From first"),de(),ce(),V({selectedFromId:null,selectedToId:null,diff:null}),_("from"),a("surveyFromOptions")?.classList.remove("hidden")}),i?.addEventListener("focus",()=>{v&&(_("to"),a("surveyToOptions")?.classList.remove("hidden"))}),i?.addEventListener("input",()=>{y=null,de(),ce(),V({selectedFromId:v?.surveyTemplateId||null,selectedToId:null,diff:null}),_("to"),a("surveyToOptions")?.classList.remove("hidden")}),r?.addEventListener("click",Os),document.addEventListener("click",l=>{l.target.closest(".survey-combobox")||(a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"))}))}async function Ee(){return(await chrome.storage.local.get(S.STORAGE_KEYS.WHATS_NEW_MODAL))[S.STORAGE_KEYS.WHATS_NEW_MODAL]||{}}async function V(e){let t=await Ee();await chrome.storage.local.set({[S.STORAGE_KEYS.WHATS_NEW_MODAL]:{...t,...e,updatedAt:Date.now()}})}function mt(e){return C.find(t=>Number(t.surveyTemplateId)===Number(e))||null}function Ls(){let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value=v?te(v):""),t&&(t.value=y?te(y):"",t.disabled=!v,t.placeholder=v?"Search newer versions...":"Select From first"),de()}async function xs(){let e=await Ee();Array.isArray(e.templates)&&e.templates.length>0&&(C=Ue(e.templates)),C.length===0&&(je(),B(null,"Loading survey versions..."),await Nt()),v=e.selectedFromId?mt(e.selectedFromId):null,y=e.selectedToId?mt(e.selectedToId):null,v&&y&&y.versionNumber<=v.versionNumber&&(y=null),Ls(),_("from"),e.diff&&v&&y?B(e.diff):B(null,"Select a From and To version, then click What's New.")}async function Is(){let e=a("refreshDiffBtn");if(!(!e||e.disabled)){e.disabled=!0,e.setAttribute("aria-busy","true"),oe+=1;try{je(),ce(),await V({selectedFromId:null,selectedToId:null,diff:null,templates:[]}),await Nt(!0)}catch(t){console.error("Survey template refresh error:",t),B(null,"Unable to load survey versions.")}finally{e.disabled=!1,e.removeAttribute("aria-busy")}}}function Ue(e){return(Array.isArray(e)?e:Object.values(e||{})).filter(n=>n&&n.surveyTemplateId&&n.versionNumber!==void 0&&n.versionNumber!==null).map(n=>({...n,surveyTemplateId:Number(n.surveyTemplateId),versionNumber:Number(n.versionNumber)})).filter(n=>!Number.isNaN(n.surveyTemplateId)&&!Number.isNaN(n.versionNumber)).sort((n,s)=>s.versionNumber-n.versionNumber)}async function Nt(e=!1){if(C.length>0&&!e){_("from");return}if(!e){let n=await Ee();if(Array.isArray(n.templates)&&n.templates.length>0){C=Ue(n.templates),_("from");return}}e&&(C=[]);let t=a("surveyFromSearch");t&&(t.placeholder="Loading versions...",t.disabled=!0);try{C=Ue(await rt()),await V({templates:C}),t&&(t.disabled=!1,t.placeholder="Search versions..."),_("from")}catch(n){throw console.error("Survey template load error:",n),t&&(t.disabled=!1,t.placeholder="Unable to load versions"),n}}function je(){v=null,y=null;let e=a("surveyFromSearch"),t=a("surveyToSearch");e&&(e.value="",e.disabled=!1,e.placeholder="Search versions..."),t&&(t.value="",t.disabled=!0,t.placeholder="Select From first"),a("surveyFromOptions")?.classList.add("hidden"),a("surveyToOptions")?.classList.add("hidden"),a("surveyFromOptions")&&(a("surveyFromOptions").innerHTML=""),a("surveyToOptions")&&(a("surveyToOptions").innerHTML=""),de()}function ce(){let e=a("diffDateRange"),t=a("diffContent");e&&(e.textContent="",e.classList.add("hidden")),t&&(t.innerHTML="")}function te(e){let t=e.releasedOn?P(e.releasedOn):"-",n=e.deactivatedOn?P(e.deactivatedOn):"-";return`Version-${e.versionNumber} (Released on: ${t}, Deactivated on: ${n})`}function Rs(e){return e==="to"?v?C.filter(t=>t.versionNumber>v.versionNumber):[]:C}function _(e){let t=a(e==="from"?"surveyFromSearch":"surveyToSearch"),n=a(e==="from"?"surveyFromOptions":"surveyToOptions");if(!t||!n)return;let s=t.value.trim().toLowerCase(),o=Rs(e).filter(i=>te(i).toLowerCase().includes(s));if(n.innerHTML="",o.length===0){let i=document.createElement("div");i.className="survey-option-empty",i.textContent=C.length===0?"No survey versions found.":"No matching versions.",n.appendChild(i);return}o.forEach(i=>{let r=document.createElement("button");r.type="button",r.className="survey-option",r.value=String(i.surveyTemplateId),r.textContent=te(i),r.addEventListener("click",()=>{Cs(e,i)}),n.appendChild(r)})}function Cs(e,t){if(e==="from"){v=t,y=null;let n=a("surveyFromSearch"),s=a("surveyToSearch");n&&(n.value=te(t)),s&&(s.value="",s.disabled=!1,s.placeholder="Search newer versions..."),a("surveyFromOptions")?.classList.add("hidden"),_("to"),ce(),V({selectedFromId:t.surveyTemplateId,selectedToId:null,diff:null})}else{y=t;let n=a("surveyToSearch");n&&(n.value=te(t)),a("surveyToOptions")?.classList.add("hidden"),ce(),V({selectedFromId:v?.surveyTemplateId||null,selectedToId:t.surveyTemplateId,diff:null})}de()}function de(){let e=a("runSurveyDiffBtn");e&&e.classList.toggle("hidden",!v||!y)}async function Os(){if(!v||!y)return;let e=a("runSurveyDiffBtn"),t=oe+1;oe=t,e&&(e.disabled=!0,e.textContent="Loading...");try{let n=await Ee();if(n.diff&&Number(n.selectedFromId)===Number(v.surveyTemplateId)&&Number(n.selectedToId)===Number(y.surveyTemplateId)){B(n.diff);return}B(null,"Loading changes...");let s=await lt(v.surveyTemplateId,y.surveyTemplateId);t===oe&&(B(s),await V({selectedFromId:v.surveyTemplateId,selectedToId:y.surveyTemplateId,diff:s}))}catch(n){console.error("Survey diff error:",n),t===oe&&B(null,"Unable to load survey differences.")}finally{e&&(e.disabled=!1,e.textContent="What's New")}}function B(e,t="No changes detected between the selected survey templates."){let n=a("diffDateRange"),s=a("diffContent");if(!n||!s)return;if(s.innerHTML="",!e||e.newQuestions.length===0&&e.removedQuestions.length===0&&e.modifiedQuestions.length===0){n.classList.add("hidden");let r=document.createElement("div");r.className="diff-empty",r.textContent=t,s.appendChild(r);return}let o=e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn?P(e.metadata.fromReleasedOn||e.metadata.fromUpdatedOn):"Unknown",i=e.metadata.toReleasedOn||e.metadata.toUpdatedOn?P(e.metadata.toReleasedOn||e.metadata.toUpdatedOn):"Unknown";n.textContent=`From V-${e.metadata.fromVersionNumber||e.metadata.fromId} (${o}) to V-${e.metadata.toVersionNumber||e.metadata.toId} (${i})`,n.classList.remove("hidden"),e.newQuestions.forEach(r=>{let l=document.createElement("div");l.className="diff-item",l.innerHTML=`
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(l)}),e.removedQuestions.forEach(r=>{let l=document.createElement("div");l.className="diff-item",l.innerHTML=`
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${r.questionText||"\u2014"}</div>
        `,s.appendChild(l)}),e.modifiedQuestions.forEach(r=>{let l=document.createElement("div");l.className="diff-item";let d="",c="";r.textChanged&&(d+='<span class="diff-tag changed">Question Changed</span>',c+=`
                <div class="diff-detail"><strong>Old:</strong> ${r.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${r.textChanged.new}</div>
            `),r.optionsChanged&&(d+='<span class="diff-tag changed">Options Changed</span>',r.optionsChanged.added?.length>0&&(c+=`<div class="diff-detail"><strong>Added Options:</strong> ${r.optionsChanged.added.join(", ")}</div>`),r.optionsChanged.removed?.length>0&&(c+=`<div class="diff-detail"><strong>Removed Options:</strong> ${r.optionsChanged.removed.join(", ")}</div>`)),l.innerHTML=`
            <h4>${d} <span class="diff-id">[${r.alternateQuestionId}]</span></h4>
            ${c}
        `,s.appendChild(l)})}
