Notes on Admissions Visualization.
The general question Kasey wanted to know was how the feeder schools students perform at UA. 
Are they retained, do they make it through the system, etc.

To that end, Matrix extracts from 2007 and 2008 entering classes were queried for their originating high school
And Matched with the lat and lon of their zip code. Their fate was considered as well based on current enrollment and
graduation records. if they did not graduate theeir last term is recorded.

fateExtract.sql on newsol:
		use saresearch
		go
		SELECT DISTINCT e.EMPLID, e.STRM,
			CASE e.COMPLETION_TERM
				WHEN '' THEN 'NONE'
				ELSE e.COMPLETION_TERM
				END AS grad_term,
		 max_t.strm AS last_enrolled_term,
		 e.cum_gpa, scx.ext_org_id, appllevelabor, scx.descr50, z.Zipcode, f07.schoolstate, z.latitude,
		 z.longitude, OIRPSTerm FROM EnrlData e
		INNER JOIN PS_EMPLID_XWALK pex 
		ON e.EMPLID = pex.EMPLID
		INNER JOIN MatrixFall07 f07
		ON f07.SID = pex.sid 
		INNER JOIN [dbo].[US_Zip_Codes] z
		on left(f07.SchoolPostalCode,5) = z.Zipcode
		INNER JOIN School_XWALK scx
		on f07.SchoolCode = scx.ACT_CD
		INNER JOIN (SELECT MAX(strm) as strm, t.emplid FROM EnrlData t GROUP BY t.emplid) max_t
			on e.EMPLID = max_t.EMPLID 

		where scx.ACT_CD <> '' and ApplLevelABOR in ('Freshman', 'Freshman-ABOR')
			and e.STRM = (SELECT MAX(strm) FROM EnrlData t WHERE t.EMPLID = e.EMPLID GROUP BY t.emplid)
		--Order by EMPLID, e.STRM DESC


		union 

		select distinct e.EMPLID, e.STRM,
			case e.COMPLETION_TERM
				when '' then 'NONE'
				else e.COMPLETION_TERM
				end as grad_term,
		max_t.strm as last_enrolled_term,
		 e.cum_gpa, scx.ext_org_id, appllevelabor, scx.descr50, z.Zipcode, f08.schoolstate, z.latitude, z.longitude, OIRPSTerm from EnrlData e
		inner join PS_EMPLID_XWALK pex 
		ON e.EMPLID = pex.EMPLID
		inner join MatrixFall08 f08
		ON f08.SID = pex.sid 
		inner join [dbo].[US_Zip_Codes] z
		on left(f08.SchoolPostalCode,5) = z.Zipcode
		inner join School_XWALK scx
		on f08.SchoolCode = scx.ACT_CD
		inner join (select MAX(strm) as strm, t.emplid from EnrlData t group by t.emplid) max_t
			on e.EMPLID = max_t.EMPLID 

		where scx.ACT_CD <> '' and ApplLevelABOR in ('Freshman', 'Freshman-ABOR')
			and e.STRM = (select MAX(strm) from EnrlData t where t.EMPLID = e.EMPLID group by t.emplid)